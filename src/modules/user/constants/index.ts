import { BadRequestException, PipeTransform } from "@nestjs/common";
import { isValidObjectId } from "mongoose";

export const DEFAULT_REQUEST_LIMIT = 5;
export const REFERRALS_BATCH = 10;

export const USER_ROLES = {
    USER: 'USER',
    ADMIN: 'ADMIN',
} as const;

export const Routes = {
    PREFIX: 'user',
    POSTBACK: 'postback',
    VERIFY: 'verify',
    REFERRALS: 'referrals',
    INVITE: 'invite'
}

export const verifyOneWinIdParamPipe: PipeTransform<string, number> = {
    transform: (value) => {
        const parsedValue = parseInt(value);

        if (!parsedValue || isNaN(parsedValue)) throw new BadRequestException('Invalid onewin id');

        return parsedValue;
    }
}

export const validateReferralCursorQueryPipe: PipeTransform<string, string> = {
    transform: (value) => {
        if (!value) return value;

        const trimmed = value.trim();

        if (!isValidObjectId(trimmed)) throw new BadRequestException('Invalid referral cursor');

        return trimmed;
    }
}