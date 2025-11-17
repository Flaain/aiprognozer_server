import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { ProductModule } from '../product/product.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [ProductModule, PaymentModule],
  providers: [StoreService],
  controllers: [StoreController]
})
export class StoreModule {}
