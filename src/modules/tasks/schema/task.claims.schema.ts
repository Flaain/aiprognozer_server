import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { TasksCollectionType } from '../types';

@Schema({ timestamps: true, collection: 'tasks_claims' })
export class TasksClaims {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true, index: true })
    userId: mongoose.Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, refPath: 'refCollection', required: true, index: true })
    taskId: mongoose.Types.ObjectId;

    @Prop({ type: String, required: true })
    refCollection: TasksCollectionType;

    @Prop({ type: String, required: true })
    dailyPrefix: string;

    @Prop({ type: Number, required: true })
    taskReward: number;

    @Prop({ type: String, required: true })
    taskTitle: string;

    @Prop({ type: String })
    taskDescription?: string;

    @Prop({ type: String })
    taskLink?: string;
}

export const TasksClaimsSchema = SchemaFactory.createForClass(TasksClaims);

TasksClaimsSchema.index(
    { userId: 1, taskId: 1 },
    {
        unique: true,
        partialFilterExpression: {
            refCollection: {
                $in: ['tasks_ads', 'tasks_referrals', 'tasks_socials', 'tasks_requests'],
            },
        },
    },
);

TasksClaimsSchema.index(
    { userId: 1, taskId: 1, dailyPrefix: 1 },
    { unique: true, partialFilterExpression: { refCollection: 'tasks_daily' } },
);