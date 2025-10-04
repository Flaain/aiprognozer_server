import mongoose from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ms } from "src/shared/utils/ms";

@Schema({ timestamps: true })
export class Session {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true })
    user_id: mongoose.Types.ObjectId;
    
    @Prop({ type: String })
    user_ip: string;
    
    @Prop({ type: String })
    user_agent: string;
    
    @Prop({ type: Date, required: true, default: () => ms('30d') })
    expires_at?: Date;

    @Prop({ type: Date, expires: '30d' })
    createdAt?: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);