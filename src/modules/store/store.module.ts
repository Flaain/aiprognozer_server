import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { ProductModule } from '../product/product.module';
import { PaymentModule } from '../payment/payment.module';
import { GatewayModule } from '../gateway/gateway.module';
import { UserModule } from '../user/user.module';

@Module({
    imports: [ProductModule, PaymentModule, GatewayModule, UserModule],
    providers: [StoreService],
    controllers: [StoreController],
})
export class StoreModule {}