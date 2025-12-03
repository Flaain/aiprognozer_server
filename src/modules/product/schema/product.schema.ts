import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PRODUCT_EFFECT, PRODUCT_TYPE } from '../constants';
import { PRODUCT_SLUGS, ProductEffect, ProductType } from '../types';

@Schema({ timestamps: true })
export class Product {
    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: String, required: true })
    description: string;

    @Prop({ type: Number, required: true })
    price: number;

    @Prop({ type: Number, enum: Object.values(PRODUCT_TYPE), required: true })
    type: ProductType;

    @Prop({ type: String, enum: PRODUCT_SLUGS, index: true, unique: true, required: true })
    slug: PRODUCT_SLUGS;

    @Prop({ type: String, enum: PRODUCT_SLUGS })
    prev?: PRODUCT_SLUGS;

    @Prop({ type: String, enum: PRODUCT_SLUGS })
    next?: PRODUCT_SLUGS;

    @Prop({
        type: [
            {
                _id: { _id: false },
                value: Number,
                effect_type: { type: String, enum: Object.values(PRODUCT_EFFECT), required: true },
                target: String,
            },
        ],
    })
    effect?: Array<ProductEffect>;
}

export const ProductSchema = SchemaFactory.createForClass(Product);