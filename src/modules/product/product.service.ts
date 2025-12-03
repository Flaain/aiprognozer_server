import { Injectable } from '@nestjs/common';
import { ProductRepository } from './product.repository';
import { PRODUCT_TYPE } from './constants';
import { AggregateOptions, PipelineStage, ProjectionType, QueryOptions, RootFilterQuery, Types } from 'mongoose';
import { PRODUCT_SLUGS } from './types';
import { Product } from './schema/product.schema';

@Injectable()
export class ProductService {
    constructor(private readonly productRepository: ProductRepository) {}

    public getFirstLadderProduct = () => this.productRepository.findOne({ type: PRODUCT_TYPE.LADDER, prev: null });

    public getProducts = (userId: Types.ObjectId) => this.productRepository.getProducts(userId);

    public getProductById = (productId: Types.ObjectId | string, projection?: ProjectionType<Product>) => this.productRepository.findById(productId, projection);

    public getProductBySlug = (slug: PRODUCT_SLUGS) => this.productRepository.findOne({ slug });

    public findOne = (filter?: RootFilterQuery<Product>, projection?: ProjectionType<Product>, options?: QueryOptions<Product>) => this.productRepository.findOne(filter, projection, options);

    public aggregate = <T = Product>(pipeline?: Array<PipelineStage>, options?: AggregateOptions) => this.productRepository.aggregate<T>(pipeline, options);
}