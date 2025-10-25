import { BadRequestException, PipeTransform } from "@nestjs/common";

export const USER_ROLES = {
    USER: 'USER',
    ADMIN: 'ADMIN',
} as const;

export const Routes = {
    PREFIX: 'user',
    POSTBACK: 'postback',
    VERIFY: 'verify'
}

export const verifyOneWinIdParamPipe: PipeTransform<string, number> = {
    transform: (value) => {
        const parsedValue = parseInt(value);

        if (!parsedValue || isNaN(parsedValue)) throw new BadRequestException('Invalid onewin id');

        return parsedValue;
    }
}