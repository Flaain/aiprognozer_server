import { BadRequestException, PipeTransform } from "@nestjs/common";
import { isValidObjectId } from "mongoose";

export const DEFAULT_REQUEST_LIMIT = 5;
export const REFERALLS_BATCH = 10;

export const USER_ROLES = {
    USER: 'USER',
    ADMIN: 'ADMIN',
} as const;

export const Routes = {
    PREFIX: 'user',
    POSTBACK: 'postback',
    VERIFY: 'verify',
    REFERALLS: 'referalls',
}

export const verifyOneWinIdParamPipe: PipeTransform<string, number> = {
    transform: (value) => {
        const parsedValue = parseInt(value);

        if (!parsedValue || isNaN(parsedValue)) throw new BadRequestException('Invalid onewin id');

        return parsedValue;
    }
}

export const validateReferallCursorQueryPipe: PipeTransform<string, string> = {
    transform: (value) => {
        if (!value) return value;

        const trimmed = value.trim();

        if (!isValidObjectId(trimmed)) throw new BadRequestException('Invalid referall cursor');

        return trimmed;
    }
}