import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment } from './schema/payment.schema';
import { PRODUCT_TYPE } from '../product/constants';
import { PAYMENT_STATUS } from './constants';
import { Product } from '../product/schema/product.schema';

@Injectable()
export class PaymentRepository {
    constructor(@InjectModel(Payment.name) private readonly paymentModel: Model<Payment>) {}

    public getCurrentLadder = (userId: Types.ObjectId) =>
        this.paymentModel.aggregate<Product & { nextProduct?: Product; isLastProductWasPurchased?: boolean }>([
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
                        $mergeObjects: [
                            '$product',
                            {
                                nextProduct: '$nextProduct',
                                isLastProductWasPurchased: {
                                    $cond: {
                                        if: { $eq: ['$product.next', null] },
                                        then: true,
                                        else: '$$REMOVE',
                                    },
                                },
                            },
                        ],
                    },
                },
            },
        ]);
}