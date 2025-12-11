import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schema/payment.schema';
import { PaymentRepository } from './payment.repository';
import { ProductModule } from '../product/product.module';

@Module({
    imports: [ProductModule, MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }])],
    providers: [PaymentService, PaymentRepository],
    controllers: [PaymentController],
    exports: [PaymentRepository, PaymentService],
})
export class PaymentModule {}