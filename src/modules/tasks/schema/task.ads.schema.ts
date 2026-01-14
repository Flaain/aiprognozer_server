import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MAPPED_TASK_TYPE } from '../constants';
import { ITasksAds } from '../types';

@Schema({ timestamps: true, collection: 'tasks_ads' })
export class TasksAds implements ITasksAds {
    @Prop({ type: Number, unique: true, index: { unique: true, partialFilterExpression: { id: { $type: 'Number' } } } })
    telegram_id?: number;

    @Prop({ type: String })
    telegram_username?: string;

    @Prop({ type: String, required: true })
    link: string;

    @Prop({ type: Number, enum: MAPPED_TASK_TYPE, required: true })
    type: number;

    @Prop({ type: String, required: true })
    title: string;

    @Prop({ type: String })
    image_url?: string;

    @Prop({ type: String, required: true })
    description: string;

    @Prop({ type: Number, required: true })
    reward: number;

    @Prop({ type: Date, required: true, expires: 0 })
    expireAt: Date;
}

export const TasksAdsSchema = SchemaFactory.createForClass(TasksAds);