import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { ApplicationStatus, IApplication } from '../types';
import { APPLICATION_STATUS } from '../constants';

@Schema({ timestamps: true })
export class Application implements IApplication {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
    userId: mongoose.Types.ObjectId;

    @Prop({ type: String, required: true })
    one_win_name: string;

    @Prop({ type: String, required: true, enum: Object.values(APPLICATION_STATUS), default: APPLICATION_STATUS.PENDING })
    status: ApplicationStatus;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);