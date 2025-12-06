import mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PAYMENT_STATUS } from '../constants';
import { PaymentStatus } from '../types';

@Schema({ timestamps: true })
export class Payment {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true })
    userId: mongoose.Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true })
    productId: mongoose.Types.ObjectId;

    @Prop({ type: Number})
    productPrice?: number; // If product status is PAID there will always be a price. But if price is dynamic and status is PENDING it will be missing

    @Prop({ type: String, required: true })
    productName: string;

    @Prop({ type: String, required: true })
    productDescription: string;

    @Prop({ type: Number, enum: Object.values(PAYMENT_STATUS), required: true })
    status: PaymentStatus;

    @Prop({ type: String })
    invoicePayload?: string;

    @Prop({ type: String })
    telegramPaymentChargeId?: string;

    @Prop({ type: Date })
    payedAt?: Date;

    @Prop({ type: Date })
    refundedAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);