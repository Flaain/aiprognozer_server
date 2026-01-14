import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { TasksAds } from './schema/task.ads.schema';
import { ClientSession, Model, QueryOptions, RootFilterQuery, Types, UpdateQuery } from 'mongoose';
import { TasksReferrals } from './schema/task.referrals.schema';
import { TasksSocials } from './schema/task.socials.schema';
import { TasksRequests } from './schema/task.requests.schema';
import { TasksClaims } from './schema/task.claims.schema';
import { ITasksAds, ITasksReferrals, ITasksSocials, TaskBase } from './types';
import { getBaseTasksPipelineFactory } from './utils/getBaseTasksPipelineFactory';
import { getThresholdBasePipelineFactory } from './utils/getThresholdBasePipelineFactory';
import { TasksDaily } from './schema/task.daily.schema';
import { ms } from 'src/shared/utils/ms';

@Injectable()
export class TasksRepository {
    constructor(
        @InjectModel(TasksAds.name) private readonly tasksAdsModel: Model<TasksAds>,
        @InjectModel(TasksReferrals.name) private readonly tasksReferralsModel: Model<TasksReferrals>,
        @InjectModel(TasksSocials.name) private readonly tasksSocialsModel: Model<TasksSocials>,
        @InjectModel(TasksRequests.name) private readonly tasksRequestsModel: Model<TasksRequests>,
        @InjectModel(TasksDaily.name) private readonly tasksDailyModel: Model<TasksDaily>,
        @InjectModel(TasksClaims.name) private readonly tasksClaimsModel: Model<TasksClaims>,
    ) {}

    public getSocialsTasks = (userId: Types.ObjectId) => {
        return this.tasksSocialsModel.aggregate<ITasksSocials>(getBaseTasksPipelineFactory(userId));
    };

    public getAdsTasks = (userId: Types.ObjectId) => {
        return this.tasksAdsModel.aggregate<ITasksAds>([
            {
                $match: {
                    $expr: {
                        $gte: ['$expireAt', { $dateAdd: { startDate: '$$NOW', unit: 'minute', amount: 2 } }],
                    },
                },
            },
            ...getBaseTasksPipelineFactory(userId),
        ]);
    };

    public getReferralsTasks = (userId: Types.ObjectId, total_verified: number) => {
        return this.tasksReferralsModel.aggregate<ITasksReferrals>(
            getThresholdBasePipelineFactory(userId, total_verified),
        );
    };

    public getRequestsTasks = async (userId: Types.ObjectId, total_requests: number) => {
        const tasks = await this.tasksRequestsModel.aggregate<ITasksReferrals>(
            getThresholdBasePipelineFactory(userId, total_requests),
        );

        return {
            tasks,
            total_requests,
        };
    };

    public getDailyTasks = (userId: Types.ObjectId) => {
        return this.tasksDailyModel.aggregate<TaskBase>([
            {
                $lookup: {
                    let: { taskId: '$_id' },
                    from: 'tasks_claims',
                    as: 'claim',
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [{ $eq: ['$taskId', '$$taskId'] }, { $eq: ['$userId', userId] }],
                                },
                            },
                        },
                        { $sort: { createdAt: -1 } },
                        { $limit: 1 },
                    ],
                },
            },
            { $unwind: { path: '$claim', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    canClaim: {
                        $cond: {
                            if: {
                                $or: [
                                    { $eq: ['$claim', null] },
                                    { $lt: [{ $add: ['$claim.createdAt', ms('24h')] }, '$$NOW'] },
                                ],
                            },
                            then: true,
                            else: false,
                        },
                    },
                },
            },
            { $project: { claim: 0 } },
            { $sort: { canClaim: -1, createdAt: -1 } },
        ]);
    };

    public isAlreadyClaimed = async (userId: Types.ObjectId, taskId: Types.ObjectId | string) => this.tasksClaimsModel.exists({ taskId, userId });

    public findAdsTaskById = (taskId: Types.ObjectId | string) => this.tasksAdsModel.findById(taskId);

    public findReferralsTaskById = (taskId: Types.ObjectId | string) => this.tasksReferralsModel.findById(taskId);

    public findSocialsTaskById = (taskId: Types.ObjectId | string) => this.tasksSocialsModel.findById(taskId);

    public findRequestsTaskById = (taskId: Types.ObjectId | string) => this.tasksRequestsModel.findById(taskId);

    public findDailyTaskById = (taskId: Types.ObjectId | string) => this.tasksDailyModel.findById(taskId);

    public claimTask = (task: TasksClaims, session: ClientSession) => this.tasksClaimsModel.create([task], { session });

    public findOneAndUpdateClaim = <T>(
        filter: RootFilterQuery<TasksClaims>,
        update: UpdateQuery<TasksClaims>,
        options: QueryOptions<TasksClaims>,
    ) => this.tasksClaimsModel.findOneAndUpdate<T>(filter, update, options);
}