import { PipeTransform } from '@nestjs/common';
import { TaskType } from '../types';

export const TASK_TYPE = {
    0: 'CHANNEL',
    1: 'GROUP',
    2: 'BOT',
    3: 'EXTERNAL',
} as const;

export const SOCIAL_PLATFORM = {
    0: 'TWITTER',
    1: 'FACEBOOK',
    2: 'INSTAGRAM',
    3: 'TIKTOK',
    4: 'YOUTUBE',
    5: 'TELEGRAM',
} as const;

export const Routes = {
    PREFIX: 'tasks',
    VERIFY: 'verify/:id',
};

export const tasksTypes: Array<TaskType> = ['ads', 'referrals', 'requests', 'socials'];

export const queryVerifyTypePipe: PipeTransform<TaskType, TaskType> = {
    transform: (type) => {
        if (!type) throw new Error('Task type is required');
        if (!tasksTypes.includes(type)) throw new Error('Invalid task type');

        return type;
    },
};

export const MAPPED_TASK_TYPE = Object.keys(TASK_TYPE).map(Number);
export const MAPPED_TASK_PLATFORM = Object.keys(SOCIAL_PLATFORM).map(Number);