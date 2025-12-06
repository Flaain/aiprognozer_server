import { HydratedDocument, SchemaTimestampsConfig } from 'mongoose';
import { Product } from '../schema/product.schema';
import { PRODUCT_EFFECT, PRODUCT_TYPE } from '../constants';

export interface ProductEffect {
    value?: number | boolean;
    effect_type: ProductEffectType;
    target: string;
}

export type ProductType = typeof PRODUCT_TYPE[keyof typeof PRODUCT_TYPE];
export type ProductEffectType = typeof PRODUCT_EFFECT[keyof typeof PRODUCT_EFFECT];
export type ProductDocument = HydratedDocument<Product> & SchemaTimestampsConfig;