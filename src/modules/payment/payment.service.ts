import { Injectable } from '@nestjs/common';
import { ProductService } from '../product/product.service';
import { PaymentRepository } from './payment.repository';
import { Types } from 'mongoose';
import { Product } from '../product/schema/product.schema';

@Injectable()
export class PaymentService {
    constructor(
        private readonly productService: ProductService,
        private readonly paymentRepository: PaymentRepository,
    ) {}

    public getCurrentLadder = async (userId: Types.ObjectId) => {
        const [data] = await this.paymentRepository.getCurrentLadder(userId);

        if (!data) {
            const product = await this.productService.getFirstLadderProduct();

            return product.toObject<Product>();
        }

        const { nextProduct, ...product } = data;

        return product.isLastProductWasPurchased ? product : nextProduct;
    };
}