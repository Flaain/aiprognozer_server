import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from './product.repository';
import { PRODUCT_TYPE } from './constants';
import { AggregateOptions, PipelineStage, ProjectionType, QueryOptions, RootFilterQuery, Types } from 'mongoose';
import { Product } from './schema/product.schema';

@Injectable()
export class ProductService {
    constructor(private readonly productRepository: ProductRepository) {}

    public getFirstLadderProduct = () => this.productRepository.findOne({ type: PRODUCT_TYPE.LADDER, prev: null });

    public getProducts = (userId: Types.ObjectId) => this.productRepository.getProducts(userId);

    public getProductById = async (productId: Types.ObjectId | string, projection?: ProjectionType<Product>) => {
        const product = await this.productRepository.findById(productId, projection);

        if (!product) throw new NotFoundException('Product not found');

        return product;
    }

    public getProductBySlug = async (slug: string) => {
        const product = await this.productRepository.findOne({ slug });

        if (!product) throw new NotFoundException('Product not found');

        return product;
    }

    public findOne = (filter?: RootFilterQuery<Product>, projection?: ProjectionType<Product>, options?: QueryOptions<Product>) => this.productRepository.findOne(filter, projection, options);

    public aggregate = <T = Product>(pipeline?: Array<PipelineStage>, options?: AggregateOptions) => this.productRepository.aggregate<T>(pipeline, options);
}