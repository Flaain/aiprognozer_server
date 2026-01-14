import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { TaskBase } from "../types";

@Schema({ timestamps: true, collection: 'tasks_requests' })
export class TasksRequests implements TaskBase {
    @Prop({ type: String, required: true })
    title: string;

    @Prop({ type: String, required: true })
    description: string;
    
    @Prop({ type: Number, required: true })
    reward: number;

    @Prop({ type: Number, required: true })
    threshold: number;
}

export const TasksRequestsSchema = SchemaFactory.createForClass(TasksRequests);