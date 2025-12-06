import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductService } from '../product/product.service';
import { PaymentRepository } from './payment.repository';
import { ProjectionType, QueryOptions, RootFilterQuery, Types, UpdateQuery } from 'mongoose';
import { Product } from '../product/schema/product.schema';
import { Payment } from './schema/payment.schema';
import { PAYMENT_STATUS } from './constants';

@Injectable()
export class PaymentService {
    constructor(
        private readonly productService: ProductService,
        private readonly paymentRepository: PaymentRepository,
    ) {}

    public getCurrentLadder = async (userId: Types.ObjectId) => {
        const [product] = await this.paymentRepository.getCurrentLadder(userId);

        if (!product) {
            const product = await this.productService.getFirstLadderProduct();

            return {
                ...product.toObject<Product>(),
                canBuy: true
            }
        }

        return product;
    };

    public isAlreadyPayed = async (userId?: Types.ObjectId, productId?: Types.ObjectId, _id?: Types.ObjectId) => this.paymentRepository.isAlreadyPayed(userId, productId, _id);
    
    public isAlreadyPayedOrRefunded = async (_id: Types.ObjectId) => {
        const payment = await this.paymentRepository.findById(_id);
        
        if (!payment) throw new NotFoundException('Payment not found');

        return payment.status === PAYMENT_STATUS.PAID || payment.status === PAYMENT_STATUS.REFUNDED;
    }

    public exists = async (filter: RootFilterQuery<Payment>) => this.paymentRepository.exists(filter);

    public findById = async (id: Types.ObjectId | string, projection?: ProjectionType<Payment>, options?: QueryOptions<Payment>) => this.paymentRepository.findById(id, projection, options);

    public findPaymentOrCreate = async (filter?: RootFilterQuery<Payment>, update?: UpdateQuery<Payment>, options?: QueryOptions<Payment>) => this.paymentRepository.findOneAndUpdate(filter, update, options);

    public findOne = async (filter?: RootFilterQuery<Payment>, projection?: ProjectionType<Payment>, options?: QueryOptions<Payment>) => this.paymentRepository.findOne(filter, projection, options);

    public create = async (payment: Payment) => this.paymentRepository.create(payment);

    public findOneAndUpdate = async (filter?: RootFilterQuery<Payment>, update?: UpdateQuery<Payment>, options?: QueryOptions<Payment>) => this.paymentRepository.findOneAndUpdate(filter, update, options);
}