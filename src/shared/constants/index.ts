import * as dotenv from 'dotenv';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { BadRequestException, PipeTransform } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

dotenv.config();

export const CORS: CorsOptions = {
    origin: process.env.CLIENT_URL.split(' '),
};

export const paramPipe: PipeTransform = {
    transform: (value: string) => {
        if (!isValidObjectId(value)) throw new BadRequestException('Invalid object id');

        return value.trim();
    },
};

export const defaultResponse = { message: 'OK' };

export const PROVIDERS = {
    TG_PROVIDER: 'TG_PROVIDER',
} as const;

export const MESSAGE_EFFECT_ID = {
    CONFETTI: '5046509860389126442',
    FLAME: '5104841245755180586',
    DISLIKE: '5104858069142078462'
} as const;