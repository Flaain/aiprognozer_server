import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

@Schema({ timestamps: true })
export class Referalls {
    @Prop({ type: String, required: true, unique: true, index: true })
    code: string;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: { unique: true, partialFilterExpression: { user_id: { $type: 'objectId' } } },
    })
    user_id?: mongoose.Types.ObjectId;

    @Prop({ type: String })
    link?: string;

    @Prop({ type: String })
    description?: string;

    @Prop({ type: Boolean })
    isActive?: boolean;

    @Prop({ type: Number, default: 0 })
    total_count: number;
}

export const ReferallsSchema = SchemaFactory.createForClass(Referalls);