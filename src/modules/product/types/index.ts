import { HydratedDocument, SchemaTimestampsConfig } from 'mongoose';
import { Product } from '../schema/product.schema';
import { PRODUCT_TYPE } from '../constants';

export enum PRODUCT_SLUGS {
    daily_requests_reset,
    plus_ten_requests,
    plus_twenty_requests,
    plus_fifty_requests,
    plus_one_hundred_requests,
    plus_two_hundred_requests,
    plus_five_hundred_requests,
    plus_one_thousand_requests,
}

export type ProductType = typeof PRODUCT_TYPE[keyof typeof PRODUCT_TYPE];
export type ProductDocument = HydratedDocument<Product> & SchemaTimestampsConfig;