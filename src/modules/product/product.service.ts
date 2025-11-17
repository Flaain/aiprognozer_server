import { Injectable } from '@nestjs/common';
import { ProductRepository } from './product.repository';
import { PRODUCT_TYPE } from './constants';
import { Types } from 'mongoose';

@Injectable()
export class ProductService {
    constructor(private readonly productRepository: ProductRepository) {}

    public getFirstLadderProduct = () => this.productRepository.findOne({ type: PRODUCT_TYPE.LADDER, prev: null });

    public getProducts = (userId: Types.ObjectId) => this.productRepository.getProducts(userId);
}