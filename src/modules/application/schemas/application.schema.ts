import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { ApplicationStatus, IApplication } from '../types';
import { APPLICATION_STATUS } from '../constants';

@Schema({ timestamps: true })
export class Application implements IApplication {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true })
    userId: mongoose.Types.ObjectId;

    @Prop({ type: Number, required: true })
    onewin_id: number;

    @Prop({ type: String, required: true, enum: Object.values(APPLICATION_STATUS), default: APPLICATION_STATUS.PENDING })
    status: ApplicationStatus;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);