import { BadRequestException, FileTypeValidator, MaxFileSizeValidator, ParseFilePipe, PipeTransform } from '@nestjs/common';
import { SportType } from '../types';

export const Routes = {
    PREFIX: 'analysis',
} as const;

const ALLOWED_SPORT_TYPES: Array<SportType> = ['basketball', 'football', 'mma'];

export const ALLOWED_MIMETYPES = ['image/png', 'image/jpeg'];
export const PREDICTION_SIZE= 5;
export const MAX_SIZE = 10 * 1024 ** 2;
export const MIN_PREDICTION_PROBABILITY_PERCENT = 75;
export const MAX_PREDICTION_PROBABILITY_PERCENT = 89;
export const MIN_ALTERNATIVE_PROBABILITY_PERCENT = 39;
export const MAX_ALTERNATIVE_PROBABILITY_PERCENT = 70;

export const filePipe = new ParseFilePipe({
    fileIsRequired: true,
    validators: [
        new MaxFileSizeValidator({ maxSize: MAX_SIZE, message: `Max file size is ${MAX_SIZE / 1024 ** 2}` }),
        new FileTypeValidator({ fileType: new RegExp(`^(${ALLOWED_MIMETYPES.join('|')})$`) }),
    ],
});

export const sportTypePipe: PipeTransform<SportType> = {
    transform: (value) => {
        if (!ALLOWED_SPORT_TYPES.includes(value)) {
            throw new BadRequestException(`Unknown sport type. Allowed: ${ALLOWED_SPORT_TYPES.join(', ')}`);
        }

        return value;
    }
} 