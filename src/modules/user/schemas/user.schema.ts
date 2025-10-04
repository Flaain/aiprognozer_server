import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IUser, UserRoles } from '../types/types';
import { USER_ROLES } from '../constants';
import mongoose from 'mongoose';

@Schema({ timestamps: true })
export class User implements IUser {
    @Prop({ type: Number, required: true, unique: true, index: true })
    telegram_id: number;

    @Prop({ type: Date, default: () => new Date(), required: true })
    last_request_at: Date;
    
    @Prop({ type: Number, required: true, default: 10 })
    request_count: number;

    @Prop({ type: String, required: true, enum: Object.values(USER_ROLES), default: USER_ROLES.USER })
    role: UserRoles;

    @Prop({ type: Boolean, required: true, default: false })
    isVerified: boolean;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Applications' })
    application?: mongoose.Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);