import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

@Schema({ timestamps: true, collection: 'onewin_referalls' })
export class Referalls {
    @Prop({ type: Number, required: true, unique: true, index: true })
    onewin_id: number;

    @Prop({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: { unique: true, partialFilterExpression: { user_id: { $type: 'objectId' } } },
    })
    user_id?: mongoose.Types.ObjectId;
}

export const ReferallsSchema = SchemaFactory.createForClass(Referalls);