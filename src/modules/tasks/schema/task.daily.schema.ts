import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { TaskBase } from "../types";

@Schema({ timestamps: true, collection: 'tasks_daily' })
export class TasksDaily implements TaskBase {
    @Prop({ type: Number, unique: true, index: { unique: true, partialFilterExpression: { id: { $type: 'Number' } } } })
    telegram_id?: number;

    @Prop({ type: String })
    telegram_username?: string;

    @Prop({ type: String, required: true })
    link: string;
    
    @Prop({ type: String, required: true })
    title: string

    @Prop({ type: String, required: true })
    description: string
    
    @Prop({ type: Number, required: true })
    reward: number
}

export const TasksDailySchema = SchemaFactory.createForClass(TasksDaily);