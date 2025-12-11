import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from './schema/product.schema';
import { AggregateOptions, Model, PipelineStage, ProjectionType, QueryOptions, RootFilterQuery, Types } from 'mongoose';
import { Abortable } from 'mongodb';
import { ProductDocument } from './types';
import { PRODUCT_TYPE } from './constants';
import { ms } from 'src/shared/utils/ms';
import { PAYMENT_STATUS } from '../payment/constants';

@Injectable()
export class ProductRepository {
    constructor(@InjectModel(Product.name) private readonly productModel: Model<Product>) {}

    public findOne = (
        filter?: RootFilterQuery<Product>,
        projection?: ProjectionType<Product>,
        options?: QueryOptions<Product> & Abortable,
    ) => this.productModel.findOne<ProductDocument>(filter, projection, options);

    public findById = (id: Types.ObjectId | string, projection?: ProjectionType<Product>, options?: QueryOptions<Product>) =>
        this.productModel.findById(id, projection, options);

    public aggregate = <T = Product>(pipeline?: Array<PipelineStage>, options?: AggregateOptions) =>
        this.productModel.aggregate<T>(pipeline, options);

    public getProducts = (userId: Types.ObjectId) =>
        this.productModel.aggregate<Product & { canBuy: boolean; payedAt?: Date }>([
            { $match: { $expr: { $ne: ['$type', PRODUCT_TYPE.LADDER] } } },
            {
                $lookup: {
                    from: 'payments',
                    let: { productId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$userId', userId] },
                                        { $eq: ['$productId', '$$productId'] },
                                        { $eq: ['$status', PAYMENT_STATUS.PAID] },
                                    ],
                                },
                            },
                        },
                        { $sort: { payedAt: -1 } },
                        { $limit: 1 },
                    ],
                    as: 'payment',
                },
            },
            { $unwind: { path: '$payment', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    canBuy: {
                        $switch: {
                            branches: [
                                {
                                    case: { $eq: ['$type', PRODUCT_TYPE.DEFAULT] },
                                    then: { $eq: ['$payment', null] },
                                },
                                {
                                    case: { $eq: ['$type', PRODUCT_TYPE.DAILY] },
                                    then: {
                                        $or: [
                                            { $eq: ['$payment', null] },
                                            { $lt: [{ $add: ['$payment.payedAt', ms('24h')] }, '$$NOW'] },
                                        ],
                                    },
                                },
                            ],
                            default: false,
                        },
                    },
                    payedAt: {
                        $cond: {
                            if: { $ne: ['$payment', null] },
                            then: '$payment.payedAt',
                            else: '$$REMOVE',
                        },
                    },
                },
            },
            { $project: { payment: 0 } },
        ]);
}