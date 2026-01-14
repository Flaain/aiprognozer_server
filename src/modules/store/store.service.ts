import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UserDocument } from '../user/types/types';
import { PaymentService } from '../payment/payment.service';
import { ProductService } from '../product/product.service';
import { Connection, isValidObjectId, Types } from 'mongoose';
import { PRODUCT_TYPE } from '../product/constants';
import { ProductDocument } from '../product/types';
import { PAYMENT_STATUS } from '../payment/constants';
import { MESSAGE_EFFECT_ID, PROVIDERS } from 'src/shared/constants';
import { ms } from 'src/shared/utils/ms';
import { TgProvider } from '../tg/types';
import { GatewayService } from '../gateway/gateway.service';
import { Context } from 'grammy';
import { InvoicePayload } from '../payment/types';
import { STORE_EVENTS } from './constants';
import { InjectConnection } from '@nestjs/mongoose';
import { UserService } from '../user/user.service';
import { Product } from '../product/schema/product.schema';
import { ConfigService } from '@nestjs/config';
import { SOCKET_EVENTS } from '../gateway/constants';

@Injectable()
export class StoreService {
    private readonly logger = new Logger(StoreService.name);

    constructor(
        private readonly paymentService: PaymentService,
        private readonly productService: ProductService,
        private readonly gatewayService: GatewayService,
        private readonly userService: UserService,
        private readonly configService: ConfigService,
        @Inject(PROVIDERS.TG_PROVIDER) private readonly tgProvider: TgProvider,
        @InjectConnection() private readonly connection: Connection,
    ) {}

    public getStore = async (user: UserDocument) => {
        const currentLadder = await this.paymentService.getCurrentLadder(user._id);
        const products = await this.productService.getProducts(user._id);

        return { 
            products: [
                ...products.map((product) => product.price ? product : { ...product, price: this.calculateDynamicProductPrice(product.slug, user) }), 
                currentLadder
            ] 
        };
    };

    private calculateDynamicProductPrice = (slug: string, user: UserDocument) => {
        switch(slug) {
            case 'daily_requests_reset':
                const raw = user.request_limit / 0.02;
                // const commission = (raw * 30) / 100;

                return Math.round(raw)
            default:
                throw new BadRequestException(`Cannot calculate dynamic price. Unknown product slug: ${slug}`);
        }
    }

    private createInvoice = async (user: UserDocument, product: ProductDocument, paymentId: string) => {
        const invoice = await this.tgProvider.bot.api.createInvoiceLink(
            product.name,
            product.description,
            JSON.stringify({
                userId: user._id.toString(),
                productId: product._id.toString(),
                paymentId,
            }),
            '',
            'XTR',
            [{ 
                amount: this.configService.getOrThrow('NODE_ENV') === 'development' ? 1 : product.price ?? this.calculateDynamicProductPrice(product.slug, user), 
                label: product.name
            }],
        );

        return invoice;
    };

    private isPreviousProductPayed = async (user: UserDocument, product: ProductDocument) => {
        if (product.prev) {
            const prev = await this.productService.getProductBySlug(product.prev!);

            if (!(await this.paymentService.isAlreadyPayed(user._id, prev._id))) {
                throw new BadRequestException('Cannot create invoice. Previous product not payed');
            }
        }

        return true;
    }

    private getLadderProductInvoice = async (user: UserDocument, product: ProductDocument) => {
        await this.isPreviousProductPayed(user, product);
        
        const payment = await this.paymentService.findOneAndUpdate(
            { userId: user._id, productId: product._id, status: { $ne: PAYMENT_STATUS.REFUNDED } },
            { 
                $setOnInsert: { 
                    status: PAYMENT_STATUS.PENDING, 
                    productDescription: product.description, 
                    productName: product.name, 
                    productPrice: product.price 
                } 
            },
            { new: true, upsert: true }
        );

        if (payment?.status === PAYMENT_STATUS.PAID) {
            throw new BadRequestException('Cannot create invoice. Product already payed');
        }

        return this.createInvoice(user, product, payment._id.toString());
    };

    private getDailyProductInvoice = async (user: UserDocument, product: ProductDocument) => {
        const payment = await this.paymentService.findOneAndUpdate(
            {
                userId: user._id,
                productId: product._id,
                $or: [
                    { status: PAYMENT_STATUS.PENDING },
                    {
                        status: PAYMENT_STATUS.PAID,
                        payedAt: { $gte: new Date(Date.now() - ms('24h')) },
                    },
                ],
            },
            {
                $setOnInsert: {
                    productDescription: product.description,
                    productName: product.name,
                    productPrice: product.price,
                    userId: user._id,
                    productId: product._id,
                    status: PAYMENT_STATUS.PENDING,
                },
            },
            { sort: { createdAt: -1 }, upsert: true, new: true },
        );

        if (payment.status === PAYMENT_STATUS.PAID) {
            throw new BadRequestException('Cannot create invoice. Product already payed');
        }

        return this.createInvoice(user, product, payment._id.toString());
    };

    private getDefaultProductInvoice = async (user: UserDocument, product: ProductDocument) => {
        const payment = await this.paymentService.findOneAndUpdate(
            { userId: user._id, productId: product._id, status: { $ne: PAYMENT_STATUS.REFUNDED } },
            {
                $setOnInsert: {
                    status: PAYMENT_STATUS.PENDING,
                    productDescription: product.description,
                    productName: product.name,
                    productPrice: product.price
                }
            },
            { new: true, upsert: true }
        )

        if (payment.status === PAYMENT_STATUS.PAID) {
            throw new BadRequestException(`Cannot create invoice. Product already payed`);
        }

        return this.createInvoice(user, product, payment._id.toString());
    };

    public getInvoiceOrPreCheckout = async (user: UserDocument, productId: string) => {
        const product = await this.productService.getProductById(productId);

        switch (product.type) {
            case PRODUCT_TYPE.LADDER:
                return this.getLadderProductInvoice(user, product);
            case PRODUCT_TYPE.DAILY:
                return this.getDailyProductInvoice(user, product);
            case PRODUCT_TYPE.DEFAULT:
                return this.getDefaultProductInvoice(user, product);
            default:
                throw new BadRequestException('Invalid product type');
        }
    };

    public handleSuccessfulPayment = async (ctx: Context) => {
        const payedAt = new Date();
        const payload = this.validateInvoicePayload(ctx.message.successful_payment.invoice_payload);
        
        const session = await this.connection.startSession();

        session.startTransaction();

        try {
            const user = await this.userService.findById(payload.userId, undefined, { session });
            
            const product = (
                await this.productService.aggregate<Product & { nextProduct: Product }>(
                    [
                        { $match: { _id: new Types.ObjectId(payload.productId) } },
                        { $lookup: { from: 'products', localField: 'next', foreignField: 'slug', as: 'nextProduct' } },
                        { $unwind: { path: '$nextProduct', preserveNullAndEmptyArrays: true } },
                    ],
                    { session },
                )
            )[0];

            if (!product) throw new NotFoundException('Product not found');
            
            await this.paymentService.findOneAndUpdate(
                { _id: payload.paymentId },
                {
                    payedAt,
                    status: PAYMENT_STATUS.PAID,
                    productPrice: ctx.message.successful_payment.total_amount,
                    telegramPaymentChargeId: ctx.message.successful_payment.telegram_payment_charge_id
                },
                { session }
            );

            await this.userService.applyProductEffect(user, product.effect, session);
            
            const { nextProduct, ...restProduct } = product;

            this.gatewayService.sockets.get(payload.userId)?.forEach((socket) => {
                socket.emit(STORE_EVENTS.PRODUCT_BUY, {
                    buyedProduct: { ...restProduct, payedAt },
                    nextProduct,
                    ...(restProduct.slug.startsWith('plus') && {
                        recalculatedPrices: {
                            daily_requests_reset: this.calculateDynamicProductPrice('daily_requests_reset', user),
                        },
                    }),
                });
                socket.emit(SOCKET_EVENTS.PRODUCT_BUY, restProduct.effect);
            });

            this.tgProvider.bot.api
                .sendMessage(
                    ctx.chat.id,
                    `<b>Благодарим за покупку!</b>\n\nЗдравствуйте, ${ctx.chat.first_name}, мы получили ваш платеж за <b>"${product.name}"</b>. Спасибо за доверие!\n\n<b>Детали заказа:</b>\n\nID — <code>${ctx.message.successful_payment.telegram_payment_charge_id}</code>\nСумма — ${ctx.message.successful_payment.total_amount}\n\n<tg-spoiler><i>Если вам нужна помощь или у вас возникли вопросы, пожалуйста, напишите в службу поддержки или воспользуйтесь командой /help.</i></tg-spoiler>\n\nС уважением,\nКоманда AI PROGNOZER\n\n#чек`,
                    {
                        parse_mode: 'HTML',
                        message_effect_id: MESSAGE_EFFECT_ID.CONFETTI,
                    },
                )
                .catch((error) => this.logger.error(error));

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();

            this.logger.error(error);
        } finally {
            session.endSession();
        }
    };

    public handleRefundedPayment = async (ctx: Context) => {
        const refundedAt = new Date();

        const { userId, paymentId, productId } = this.validateInvoicePayload(ctx.message.refunded_payment.invoice_payload);

        const session = await this.connection.startSession();

        session.startTransaction();

        try {
            const { 0: user, 1: product } = await Promise.all([
                this.userService.findById(userId),
                this.productService.getProductById(productId),
            ])

            await this.paymentService.findOneAndUpdate(
                { _id: paymentId },
                { status: PAYMENT_STATUS.REFUNDED, refundedAt },
                { session },
            );

            await this.userService.removeProductEffect(user, product.effect, refundedAt, session);

            this.tgProvider.bot.api
                .sendMessage(
                    ctx.chat.id,
                    `<b>Уведомление о возврате средств</b>\n\nЗдравствуйте, ${ctx.chat.first_name}, мы зафиксировали возврат платежа за <b>"${product.name}"</b>.\n\n<b>Детали операции:</b>\n\nID платежа — <code>${ctx.message.refunded_payment.telegram_payment_charge_id}</code>\nСумма возврата — ${ctx.message.refunded_payment.total_amount}\n\nВ связи с возвратом все эффекты приобретённого продукта были отключены и удалены из вашего аккаунта.\n\n<tg-spoiler><i>Если вам нужна помощь или у вас возникли вопросы, пожалуйста, напишите в службу поддержки или воспользуйтесь командой /help.</i></tg-spoiler>\n\nС уважением,\nКоманда AI PROGNOZER\n\n#возврат`,
                    {
                        parse_mode: 'HTML',
                        message_effect_id: MESSAGE_EFFECT_ID.DISLIKE,
                    },
                )
                .catch((error) => this.logger.error(error));
            
            // this.gatewayService.sockets.get(userId)?.forEach((socket) => {
            //     socket.emit(STORE_EVENTS.PRODUCT_REFUNDED, { ...product, refundedAt });
            // });

            await session.commitTransaction();
        } catch (error) {
            this.logger.error(error);
            await session.abortTransaction();   
        } finally {
            session.endSession();
        }
    };

    public handlePreCheckoutQuery = async (ctx: Context) => {
        try {
            const { productId, userId, paymentId } = this.validateInvoicePayload(ctx.preCheckoutQuery.invoice_payload);

            if (await this.paymentService.isAlreadyPayedOrRefunded(new Types.ObjectId(paymentId))) {
                throw new BadRequestException('Cannot proceed payment. This invoice was already payed or refunded.');
            }

            const { 0: user, 1: product } = await Promise.all([
                this.userService.findById(userId),
                this.productService.getProductById(productId),
            ])

            if (ctx.preCheckoutQuery.total_amount !== (product.price ?? this.calculateDynamicProductPrice(product.slug, user))) {
                throw new BadRequestException('Canoot proceed payment. Product price has changed, please create a new invoice.');
            }

            await this.isPreviousProductPayed(user, product);
            
            return ctx.answerPreCheckoutQuery(true);
        } catch (error) {
            this.logger.error(error);
            return ctx.answerPreCheckoutQuery(false, { error_message: error.message });
        }
    };

    private validateInvoicePayload = (payload: string): InvoicePayload => {
        const parsed = JSON.parse(payload);

        if (parsed === null || parsed.constructor.name !== 'Object') throw new BadRequestException('Invalid payload');
        
        const fields: Array<keyof InvoicePayload> = ['paymentId', 'productId', 'userId'];
        const payloadKeys = Object.keys(parsed);

        if (!payloadKeys.length) throw new BadRequestException('Empty payload');

        if (payloadKeys.length !== fields.length) throw new BadRequestException('Unknown keys length in payload');

        for (const key of payloadKeys) {
            if (!fields.includes(key as keyof InvoicePayload)) {
                throw new BadRequestException(`Unknown payload key: ${key}`);
            }

            if (!isValidObjectId(parsed[key])) {
                throw new BadRequestException(`Invalid payload value: ${parsed[key]} in key: ${key}`);
            }
        }

        return parsed;
    }
}