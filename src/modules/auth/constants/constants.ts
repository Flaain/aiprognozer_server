import { PipeTransform } from '@nestjs/common';
import { REFERRAL_CODE_LENGTH } from 'src/modules/referrals/constants';

export const Routes = {
    PREFIX: 'auth',
    LOGIN: 'login',
} as const;

export const refQueryPipe: PipeTransform<string, string> = {
    transform: (value) => {
        if (!value) return value;

        const trimmed = value.trim();

        if (trimmed.length !== REFERRAL_CODE_LENGTH) {
            throw new Error('Invalid referral code');
        }

        return trimmed;
    },
};