import { HydratedDocument, SchemaTimestampsConfig } from 'mongoose';
import { Payment } from '../schema/payment.schema';
import { PAYMENT_STATUS } from '../constants';

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
export type PaymentDocument = HydratedDocument<Payment> & SchemaTimestampsConfig;

export interface InvoicePayload {
    userId: string;
    productId: string;
    paymentId: string;
}