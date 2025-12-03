import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UserDocument } from '../user/types/types';
import { PaymentService } from '../payment/payment.service';
import { ProductService } from '../product/product.service';
import { Connection, isValidObjectId, Types } from 'mongoose';
import { PRODUCT_TYPE } from '../product/constants';
import { ProductDocument } from '../product/types';
import { PAYMENT_STATUS } from '../payment/constants';
import { PROVIDERS } from 'src/shared/constants';
import { ms } from 'src/shared/utils/ms';
import { TgProvider } from '../tg/types';
import { GatewayService } from '../gateway/gateway.service';
import { Context } from 'grammy';
import { InvoicePayload } from '../payment/types';
import { STORE_EVENTS } from './constants';
import { InjectConnection } from '@nestjs/mongoose';
import { UserService } from '../user/user.service';
import { Product } from '../product/schema/product.schema';
import { GetInvoiceOrPreCheckoutQueryMode } from './types';

@Injectable()
export class StoreService {
    private readonly logger = new Logger(StoreService.name);

    constructor(
        private readonly paymentService: PaymentService,
        private readonly productService: ProductService,
        private readonly gatewayService: GatewayService,
        private readonly userService: UserService,
        @Inject(PROVIDERS.TG_PROVIDER) private readonly tgProvider: TgProvider,
        @InjectConnection() private readonly connection: Connection,
    ) {}

    public getStore = async (user: UserDocument) => {
        const currentLadder = await this.paymentService.getCurrentLadder(user._id);
        const products = await this.productService.getProducts(user._id);

        return { products: [...products, currentLadder] };
    };

    private createInvoice = async (userId: Types.ObjectId, product: ProductDocument) => {
        const requestId = crypto.randomUUID();

        const invoice = await this.tgProvider.bot.api.createInvoiceLink(
            product.name,
            product.description,
            JSON.stringify({
                userId,
                productId: product._id.toString(),
                requestId,
            }),
            '',
            'XTR',
            [{ amount: 1, label: product.name }],
        );

        await this.paymentService.create({
            userId,
            productId: product._id,
            productPrice: product.price,
            productName: product.name,
            productDescription: product.description,
            status: PAYMENT_STATUS.PENDING,
            requestId,
            invoiceUrl: invoice,
        });

        return invoice;
    };

    private getLadderProductInvoice = async (userId: Types.ObjectId, product: ProductDocument, mode: GetInvoiceOrPreCheckoutQueryMode) => {
        const payment = await this.paymentService.findOne({ userId, productId: product._id });

        if (payment?.status === PAYMENT_STATUS.PAID) {
            throw new BadRequestException(`Cannot create ${mode}. Product already payed`);
        }

        if (product.prev) {
            const prev = await this.productService.getProductBySlug(product.prev!);

            if (!(await this.paymentService.isAlreadyPayed(userId, prev._id))) {
                throw new BadRequestException(`Cannot create ${mode}. Previous product not payed`);
            }
        }

        return mode === 'invoice' ? (payment ? payment.invoiceUrl : this.createInvoice(userId, product)) : true;
    };

    private getDailyProductInvoice = async (userId: Types.ObjectId, product: ProductDocument, mode: GetInvoiceOrPreCheckoutQueryMode) => {
        const payment = await this.paymentService.findOne({ userId, productId: product._id }, null, { sort: { createdAt: -1 } });
        const isInvoiceMode = mode === 'invoice';

        if (!payment) return isInvoiceMode ? this.createInvoice(userId, product) : false;

        if (payment.status === PAYMENT_STATUS.PAID) {
            if (+new Date(+new Date(payment.payedAt) + ms('24h')) > Date.now()) {
                throw new BadRequestException(`Cannot create ${mode}. Daily product was already payed today`);
            } else {
                if (!isInvoiceMode) throw new BadRequestException(`Cannot answer pre_checkout_query before creating invoice`);

                return this.createInvoice(userId, product);
            }
        }

        return isInvoiceMode ? payment.invoiceUrl : true;
    };

    private getDefaultProductInvoice = async (userId: Types.ObjectId, product: ProductDocument, mode: GetInvoiceOrPreCheckoutQueryMode) => {
        const payment = await this.paymentService.findOne({ userId, productId: product._id });
        const isInvoiceMode = mode === 'invoice';

        if (!payment) return isInvoiceMode ? this.createInvoice(userId, product) : false;

        if (payment.status === PAYMENT_STATUS.PAID) {
            throw new BadRequestException(`Cannot create ${mode}. Product already payed`);
        }

        return isInvoiceMode ? payment.invoiceUrl : true;
    };

    public getInvoiceOrPreCheckout = async (userId: Types.ObjectId, productId: string, mode: GetInvoiceOrPreCheckoutQueryMode) => {
        const product = await this.productService.getProductById(productId);

        if (!product) throw new NotFoundException('Product not found');

        switch (product.type) {
            case PRODUCT_TYPE.LADDER:
                return this.getLadderProductInvoice(userId, product, mode);
            case PRODUCT_TYPE.DAILY:
                return this.getDailyProductInvoice(userId, product, mode);
            case PRODUCT_TYPE.DEFAULT:
                return this.getDefaultProductInvoice(userId, product, mode);
            default:
                throw new BadRequestException('Invalid product type');
        }
    };

    public handleSuccessfulPayment = async (ctx: Context) => {
        const payedAt = new Date().toISOString();
        const payload = this.validateInvoicePayload(ctx.message.successful_payment.invoice_payload);
        
        const session = await this.connection.startSession();

        session.startTransaction();

        try {
            const user = await this.userService.findById(payload.userId, undefined, { session });

            if (!user) throw new NotFoundException('User not found');

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
                { requestId: payload.requestId },
                { 
                    payedAt,
                    status: PAYMENT_STATUS.PAID, 
                    telegramPaymentChargeId: ctx.message.successful_payment.telegram_payment_charge_id
                },
                { session }
            );

            await this.userService.applyProductEffect(user, product.effect, session);
            
            const { nextProduct, ...restProduct } = product;

            this.gatewayService.sockets.get(payload.userId)?.forEach((socket) => {
                socket.emit(STORE_EVENTS.PRODUCT_BUY, { ...restProduct, payedAt }, nextProduct);
            });

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();

            this.logger.error(error);
        } finally {
            session.endSession();
        }
    };

    public handlePreCheckoutQuery = async (ctx: Context) => {
        try {
            const { productId, userId } = this.validateInvoicePayload(ctx.preCheckoutQuery.invoice_payload);

            if (!(await this.userService.isExists({ _id: userId }))) throw new NotFoundException('User not found');

            await this.getInvoiceOrPreCheckout(new Types.ObjectId(userId), productId, 'pre_checkout_query');

            return ctx.answerPreCheckoutQuery(true);
        } catch (error) {
            this.logger.error(error);
            return ctx.answerPreCheckoutQuery(false, { error_message: 'Cannot handle payment. Please try again, if the problem persists, contact support' });
        }
    };

    private validateInvoicePayload = (payload: string): InvoicePayload => {
        const parsed = JSON.parse(payload);

        if (parsed === null || parsed.constructor.name !== 'Object') throw new BadRequestException('Invalid payload');
        
        const fields: Record<keyof InvoicePayload, (value: unknown) => boolean> = {
            userId: (value: unknown) => typeof value === 'string' && isValidObjectId(value),
            productId: (value: unknown) => typeof value === 'string' && isValidObjectId(value),
            requestId: (value: unknown) => typeof value === 'string' && /^([0-9a-fA-F]{8})-(([0-9a-fA-F]{4}\-){3})([0-9a-fA-F]{12})$/i.test(value)
        };

        const fieldsKeys = Object.keys(fields);
        const payloadKeys = Object.keys(parsed);

        if (!payloadKeys.length) throw new BadRequestException('Empty payload');

        if (payloadKeys.length !== fieldsKeys.length) throw new BadRequestException('Unknown keys length in payload');

        for (const key of payloadKeys) {
            if (!fields.hasOwnProperty(key)) {
                throw new BadRequestException(`Unknown payload key: ${key}`);
            }

            if (!fields[key](parsed[key])) {
                throw new BadRequestException(`Invalid payload value: ${parsed[key]} in key: ${key}`);
            }
        }

        return parsed;
    }
}