import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserDocument } from '../user/types/types';
import { PaymentService } from '../payment/payment.service';
import { ProductService } from '../product/product.service';
import { Types } from 'mongoose';
import { PRODUCT_TYPE } from '../product/constants';
import { ProductDocument } from '../product/types';
import { PAYMENT_STATUS } from '../payment/constants';
import { PROVIDERS } from 'src/shared/constants';
import { ms } from 'src/shared/utils/ms';
import { TgProvider } from '../tg/types';
import { GatewayService } from '../gateway/gateway.service';
import { Context, NextFunction } from 'grammy';
import { InvoicePayload } from '../payment/types';

@Injectable()
export class StoreService {
    constructor(
        private readonly paymentService: PaymentService,
        private readonly productService: ProductService,
        private readonly gatewayService: GatewayService,
        @Inject(PROVIDERS.TG_PROVIDER) private readonly tgProvider: TgProvider,
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

    private getLadderProductInvoice = async (userId: Types.ObjectId, product: ProductDocument) => {
        const payment = await this.paymentService.findOne({ userId, productId: product._id });

        if (payment?.status === PAYMENT_STATUS.PAID) {
            throw new BadRequestException('Cannot create invoice. Product already payed');
        }

        if (product.prev) {
            const prev = await this.productService.getProductBySlug(product.prev!);

            if (!(await this.paymentService.isAlreadyPayed(userId, prev._id))) {
                throw new BadRequestException('Cannot create invoice. Previous product not payed');
            }
        }

        return payment ? payment.invoiceUrl : this.createInvoice(userId, product);
    };

    private getDailyProductInvoice = async (userId: Types.ObjectId, product: ProductDocument) => {
        const payment = await this.paymentService.findOne({ userId, productId: product._id }, null, {
            sort: { createdAt: -1 },
        });

        if (!payment) return this.createInvoice(userId, product);

        if (payment.status === PAYMENT_STATUS.PAID) {
            if (+new Date(+new Date(payment.payedAt) + ms('24h')) > Date.now()) {
                throw new BadRequestException('Cannot create invoice. Daily product was already payed today');
            } else {
                return this.createInvoice(userId, product);
            }
        }

        return payment.invoiceUrl;
    };

    private getDefaultProductInvoice = async (userId: Types.ObjectId, product: ProductDocument) => {
        const payment = await this.paymentService.findOne({ userId, productId: product._id });

        if (!payment) return this.createInvoice(userId, product);

        if (payment.status === PAYMENT_STATUS.PAID) {
            throw new BadRequestException('Cannot create invoice. Product already payed');
        }

        return payment.invoiceUrl;
    };

    public getInvoice = async (userId: Types.ObjectId, productId: string) => {
        const product = await this.productService.getProductById(productId);

        if (!product) throw new NotFoundException('Product not found');

        switch (product.type) {
            case PRODUCT_TYPE.LADDER:
                return this.getLadderProductInvoice(userId, product);
            case PRODUCT_TYPE.DAILY:
                return this.getDailyProductInvoice(userId, product);
            case PRODUCT_TYPE.DEFAULT:
                return this.getDefaultProductInvoice(userId, product);
            default:
                throw new BadRequestException('Invalid product type');
        }
    };

    public handleSuccessfulPayment = async (ctx: Context, next: NextFunction) => {
        console.log(ctx.message.successful_payment);
        const payload: InvoicePayload = JSON.parse(ctx.message.successful_payment.invoice_payload);
        const payedAt = new Date().toISOString();
        console.log(payload);
        // await this.paymentService.findOneAndUpdate(
        //     { requestId: payload.requestId },
        //     { 
        //         payedAt,
        //         status: PAYMENT_STATUS.PAID, 
        //         telegramPaymentChargeId: ctx.message.successful_payment.telegram_payment_charge_id
        //     },
        // );

        // this.gatewayService.sockets.get(payload.userId)?.forEach((socket) => {
        //     socket.emit(STORE_EVENTS.PRODUCT_BUY, payedAt);
        // });
    };

    public handlePreCheckoutQuery = async (ctx: Context) => {
        const { requestId }: InvoicePayload = JSON.parse(ctx.preCheckoutQuery.invoice_payload);
        
        return ctx.answerPreCheckoutQuery(!(await this.paymentService.exists({ requestId, status: PAYMENT_STATUS.PAID })));
    };
}