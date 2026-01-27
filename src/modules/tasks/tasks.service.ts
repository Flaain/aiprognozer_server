import { BadRequestException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { UserDocument } from '../user/types/types';
import { TasksRepository } from './tasks.repository';
import { Connection, ModifyResult, Types } from 'mongoose';
import { ReferralsService } from '../referrals/referrals.service';
import { TasksClaimsDocument, TasksCollectionType, TasksDailyDocument, TaskType } from './types';
import { AppException } from 'src/shared/exceptions/app.exception';
import { TASK_TYPE } from './constants';
import { PROVIDERS } from 'src/shared/constants';
import { TgProvider } from '../tg/types';
import { InjectConnection } from '@nestjs/mongoose';
import { MongoServerError } from 'mongodb';
import { ms } from 'src/shared/utils/ms';

@Injectable()
export class TasksService {
    private readonly logger = new Logger(TasksService.name);

    constructor(
        @Inject(PROVIDERS.TG_PROVIDER) private readonly tgProvider: TgProvider,
        @InjectConnection() private readonly connection: Connection,
        private readonly tasksRepository: TasksRepository,
        private readonly referralsService: ReferralsService,
    ) {}

    public getTasks = async (user: UserDocument) => {
        const {
            0: socials,
            1: ads,
            2: requests,
            3: daily,
            4: referrals
        } = await Promise.all([
            this.tasksRepository.getSocialsTasks(user._id),
            this.tasksRepository.getAdsTasks(user._id),
            this.tasksRepository.getRequestsTasks(user._id, user.total_requests),
            this.tasksRepository.getDailyTasks(user._id),
            this.getReferralsTasks(user._id),
        ]);

        return {
            ads,
            daily,
            socials,
            requests,
            referrals,
        };
    };

    public verifyTask = async (user: UserDocument, taskId: string, type: TaskType) => {
        switch (type) {
            case 'ads':
            case 'referrals':
            case 'socials':
            case 'requests':
                return this.verifyBasicTask(user, taskId, type);
            case 'daily':
                return this.verifyDailyTask(user, taskId);
            default:
                throw new BadRequestException(`Unknown task type: ${type}`);
        }
    };

    private verifyTelegramFollow = async (telegramChatId: number, userTelegramId: number) => {
        try {
            await this.tgProvider.bot.api.getChatMember(telegramChatId, userTelegramId);
        } catch (error) {
            this.logger.error(error);
            
            throw new AppException(
                {
                    message: 'You are not a member of this chat',
                    errorCode: 'NOT_MEMBER_OF_CHAT',
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    };

    private verifyDailyTask = async (user: UserDocument, taskId: string) => {
        const task = await this.findTask<TasksDailyDocument>(taskId, 'daily');
        const session = await this.connection.startSession();

        session.startTransaction();

        try {
            const { value, lastErrorObject } = await this.tasksRepository.findOneAndUpdateClaim<ModifyResult<TasksClaimsDocument>>(
                { userId: user._id, taskId: task._id, refCollection: 'tasks_daily', createdAt: { $gte: new Date(Date.now() - ms('24h')) } },
                {
                    $setOnInsert: { 
                        dailyPrefix: new Date().toISOString().split('T')[0], 
                        taskReward: task.reward,
                        taskDescription: task.description,
                        taskLink: task.link,
                        taskTitle: task.title, 
                    }
                },
                { upsert: true, new: true, includeResultMetadata: true, session, sort: { createdAt: -1 } },
            );

            const nextClaimAvailableAt = Math.round((+new Date(value.createdAt.toString()) + ms('24h') - Date.now()) / 1000);

            if (lastErrorObject.updatedExisting) {
                throw new AppException(
                    {
                        message: 'Task already claimed',
                        errorCode: 'TASK_ALREADY_CLAIMED',
                        data: {
                            nextClaimAvailableAt,
                            claimedAt: value.createdAt,
                        }
                    },
                    HttpStatus.BAD_REQUEST,
                );
            };

            await user.updateOne(
                { $inc: { request_limit: task.reward, total_tasks_earned: task.reward } },
                { session },
            );

            await session.commitTransaction();

            return { 
                nextClaimAvailableAt,
                claimedAt: value.createdAt, 
            };
        } catch (error) {
            this.logger.error(error);

            await session.abortTransaction();

            if (error instanceof MongoServerError && error.code === 11000) {
                throw new AppException({ message: 'Task already claimed' }, HttpStatus.BAD_REQUEST);
            };

            throw error;
        } finally {
            session.endSession();
        }
    }

    private verifyBasicTask = async (user: UserDocument, taskId: string, type: Exclude<TaskType, 'daily'>) => {
        const task = await this.findTask<any>(taskId, type);
        
        const refMap: Record<Exclude<TaskType, 'daily'>, Exclude<TasksCollectionType, 'tasks_daily'>> = {
            ads: 'tasks_ads',
            referrals: 'tasks_referrals',
            socials: 'tasks_socials',
            requests: 'tasks_requests'
        };
        
        const claim = await this.tasksRepository.findOneClaim({ userId: user._id, taskId: task._id }, { createdAt: 1 });

        if (claim) {
            throw new AppException(
                {
                    message: 'Task already claimed',
                    errorCode: 'TASK_ALREADY_CLAIMED',
                    data: {
                        claimedAt: claim.createdAt,
                    }
                },
                HttpStatus.BAD_REQUEST,
            );
        };

        if ('type' in task && (TASK_TYPE[task.type] === 'CHANNEL' || TASK_TYPE[task.type] === 'GROUP')) {
            await this.verifyTelegramFollow(task.telegram_id, user.telegram_id);
        };

        if (type === 'referrals') {
            const ref = await this.referralsService.findOne({ user_id: user._id }, { total_verified: 1 });

            if (!ref) throw new BadRequestException('Cannot find referral document for particular user');
    
            if (ref.total_verified < task.threshold) {
                throw new BadRequestException(
                    `Referral threshold not met. Required: ${task.threshold}, Current: ${ref.total_verified}`,
                );
            }
        } else if (type === 'requests' && user.total_requests < task.threshold) {
            throw new BadRequestException(
                `Request threshold not met. Required: ${task.threshold}, Current: ${user.total_requests}`,
            );
        }

        const session = await this.connection.startSession();

        session.startTransaction();

        try {
            const claim = await this.tasksRepository.claimTask({
                refCollection: refMap[type],
                taskDescription: task.description,
                taskLink: task.link,
                taskReward: task.reward,
                taskTitle: task.title,
                taskId: task._id,
                userId: user._id,
                dailyPrefix: new Date().toISOString().split('T')[0],
            }, session);

            await user.updateOne(
                { $inc: { request_limit: task.reward, total_tasks_earned: task.reward } },
                { session },
            );

            await session.commitTransaction();

            return { claimedAt: claim[0].createdAt };
        } catch (error) {
            this.logger.error(error);

            await session.abortTransaction();

            if (error instanceof MongoServerError && error.code === 11000) {
                throw new AppException({ message: 'Task already claimed' }, HttpStatus.BAD_REQUEST);
            };

            throw error;
        } finally {
            session.endSession();
        }
    };

    private findTask = async <T>(taskId: string, type: TaskType): Promise<T> => {
        const actions: Record<TaskType, (taskId: string) => Promise<any>> = {
            ads: (taskId) => this.tasksRepository.findAdsTaskById(taskId),
            referrals: (taskId) => this.tasksRepository.findReferralsTaskById(taskId),
            socials: (taskId) => this.tasksRepository.findSocialsTaskById(taskId),
            requests: (taskId) => this.tasksRepository.findRequestsTaskById(taskId),
            daily: (taskId) => this.tasksRepository.findDailyTaskById(taskId),
        };

        const task = await actions[type](taskId);

        if (!task) {
            throw new AppException(
                {
                    message: 'Task not found',
                    errorCode: 'TASK_NOT_EXISTS',
                },
                HttpStatus.NOT_FOUND,
            );
        };

        return task;
    };

    private getReferralsTasks = async (userId: Types.ObjectId) => {
        const ref = await this.referralsService.findOne({ user_id: userId }, { total_verified: 1 });

        if (!ref) this.logger.warn(`No referral document found for user --> ${userId.toString()}`);

        const tasks = await this.tasksRepository.getReferralsTasks(userId, ref?.total_verified ?? 0);

        return {
            tasks,
            total_verified: ref?.total_verified ?? 0,
        };
    };
}
