import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ProjectionType, QueryOptions, RootFilterQuery, Types, UpdateQuery } from 'mongoose';
import { Payment } from './schema/payment.schema';
import { PRODUCT_TYPE } from '../product/constants';
import { PAYMENT_STATUS } from './constants';
import { Product } from '../product/schema/product.schema';
import { PaymentDocument } from './types';

@Injectable()
export class PaymentRepository {
    constructor(@InjectModel(Payment.name) private readonly paymentModel: Model<Payment>) {}

    public getCurrentLadder = (userId: Types.ObjectId) =>
        this.paymentModel.aggregate<Product & { canBuy?: boolean }>([
            { $match: { userId } },
            {
                $lookup: {
                    from: 'products',
                    localField: 'productId',
                    foreignField: '_id',
                    as: 'product',
                },
            },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
            { $match: { 'product.type': PRODUCT_TYPE.LADDER, status: PAYMENT_STATUS.PAID } },
            { $sort: { payedAt: -1 } },
            { $limit: 1 },
            {
                $lookup: {
                    from: 'products',
                    let: { nextSlug: '$product.next' },
                    pipeline: [{ $match: { $expr: { $eq: ['$slug', '$$nextSlug'] } } }],
                    as: 'nextProduct',
                },
            },
            { $unwind: { path: '$nextProduct', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    product: {
                        $cond: {
                            if: { $eq: ['$product.next', null] },
                            then: '$product',
                            else: { $mergeObjects: ['$nextProduct', { canBuy: true }] },
                        },
                    },
                },
            },
            { $replaceRoot: { newRoot: '$product' } },
        ]);

        public isAlreadyPayed = (userId?: Types.ObjectId, productId?: Types.ObjectId, _id?: Types.ObjectId) => this.paymentModel.exists(_id ? { _id, status: PAYMENT_STATUS.PAID } : { userId, productId, status: PAYMENT_STATUS.PAID });

        public isAlreadyPayedOrRefunded = (_id?: Types.ObjectId) => this.paymentModel.exists({ _id, status: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.REFUNDED] } });

        public findOneAndUpdate = (filter?: RootFilterQuery<Payment>, update?: UpdateQuery<Payment>, options?: QueryOptions<Payment>) => this.paymentModel.findOneAndUpdate(filter, update, options);

        public findOne = async (filter?: RootFilterQuery<Payment>, projection?: ProjectionType<Payment>, options?: QueryOptions<Payment>) => this.paymentModel.findOne<PaymentDocument>(filter, projection, options);

        public create = (payment: Payment) => this.paymentModel.create(payment);

        public exists = (filter: RootFilterQuery<Payment>) => this.paymentModel.exists(filter);

        public findById = (id: Types.ObjectId | string, projection?: ProjectionType<Payment>, options?: QueryOptions<Payment>) => this.paymentModel.findById(id, projection, options);
}