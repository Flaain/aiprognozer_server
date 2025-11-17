import { Injectable } from '@nestjs/common';
import { UserDocument } from '../user/types/types';
import { PaymentService } from '../payment/payment.service';
import { ProductService } from '../product/product.service';

@Injectable()
export class StoreService {
    constructor(
        private readonly paymentService: PaymentService,
        private readonly productService: ProductService,
    ) {}

    public getStore = async (user: UserDocument) => {
        const currentLadder = await this.paymentService.getCurrentLadder(user._id);
        const products = await this.productService.getProducts(user._id);

        return { products: [...products, currentLadder] };
    };
}