import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MAPPED_TASK_PLATFORM, MAPPED_TASK_TYPE } from '../constants';

@Schema({ timestamps: true, collection: 'tasks_socials' })
export class TasksSocials implements TasksSocials {
    @Prop({ type: Number, unique: true, index: { unique: true, partialFilterExpression: { id: { $type: 'Number' } } } })
    telegram_id?: number;

    @Prop({ type: String })
    telegram_username?: string;

    @Prop({ type: String, required: true })
    title: string;

    @Prop({ type: String, required: true })
    description: string;

    @Prop({ type: String, required: true })
    link: string;

    @Prop({ type: Number, enum: MAPPED_TASK_PLATFORM, required: true })
    platform: number;

    @Prop({ type: Number, enum: MAPPED_TASK_TYPE, required: true })
    type: number;

    @Prop({ type: Number, required: true })
    reward: number;
}

export const TasksSocialsSchema = SchemaFactory.createForClass(TasksSocials);