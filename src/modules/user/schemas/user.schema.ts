import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IUser, UserRoles } from '../types/types';
import { DEFAULT_REQUEST_LIMIT, USER_ROLES } from '../constants';

@Schema({ timestamps: true })
export class User implements IUser {
    @Prop({ type: Number, required: true, unique: true, index: true })
    telegram_id: number;

    @Prop({ type: Date, required: true, default: () => new Date() })
    last_request_at: Date;
    
    @Prop({ type: Date, required: true, default: () => new Date() })
    last_reset_at: Date;

    @Prop({ type: Number, required: true, default: 0 })
    request_count: number;

    @Prop({ type: Number, required: true, default: DEFAULT_REQUEST_LIMIT })
    request_limit: number;

    @Prop({ type: String, required: true, enum: Object.values(USER_ROLES), default: USER_ROLES.USER })
    role: UserRoles;

    @Prop({ type: Boolean, required: true, default: false })
    isVerified: boolean;

    @Prop({ type: Boolean, required: true, default: false })
    isBanned: boolean;

    @Prop({ type: Boolean, required: true, default: false })
    isUnlimited: boolean;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Referalls' })
    referall?: mongoose.Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);