import { HydratedDocument, Types } from 'mongoose';
import { User } from '../schemas/user.schema';
import { USER_ROLES } from '../constants';

export interface IUser {
    telegram_id: number;
    first_request_at?: Date;
    request_count: number;
    request_limit: number;
    isBanned: boolean;
    isUnlimited: boolean;
    isVerified: boolean;
    invitedBy?: Types.ObjectId;
    total_tasks_earned: number;
    total_requests: number;
    onewin?: string | Types.ObjectId;
}

export interface ToObjectUser extends Omit<IUser, 'onewin'> {
    _id: Types.ObjectId;
    onewin: { onewin_id: number }
}

export interface WebAppUser {
    id: number;
    is_bot?: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    added_to_attachment_menu?: boolean;
    allows_write_pm?: boolean;
    photo_url?: string;
}

export type UserDocument = HydratedDocument<User>;
export type UserRoles = typeof USER_ROLES[keyof typeof USER_ROLES];
export type PostbackType = 'PROMO' | 'LINK'