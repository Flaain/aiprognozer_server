import { HydratedDocument, SchemaTimestampsConfig } from "mongoose";
import { TasksReferrals } from "../schema/task.referrals.schema";
import { TasksAds } from "../schema/task.ads.schema";
import { TasksSocials } from "../schema/task.socials.schema";
import { TasksRequests } from "../schema/task.requests.schema";
import { TasksDaily } from "../schema/task.daily.schema";
import { TasksClaims } from "../schema/task.claims.schema";

export type TaskType = 'ads' | 'socials' | 'referrals' | 'requests' | 'daily';
export type TasksCollectionType = 'tasks_ads' | 'tasks_referrals' | 'tasks_socials' | 'tasks_requests' | 'tasks_daily';

export type TasksReferralsDocument = HydratedDocument<TasksReferrals> & SchemaTimestampsConfig;
export type TasksAdsDocument = HydratedDocument<TasksAds> & SchemaTimestampsConfig;
export type TasksSocialsDocument = HydratedDocument<TasksSocials> & SchemaTimestampsConfig;
export type TasksRequestsDocument = HydratedDocument<TasksRequests> & SchemaTimestampsConfig;
export type TasksDailyDocument = HydratedDocument<TasksDaily> & SchemaTimestampsConfig;
export type TasksClaimsDocument = HydratedDocument<TasksClaims> & SchemaTimestampsConfig;

export interface TaskBase {
    title: string;
    description?: string;
    reward: number;
}

export interface ITasksSocials extends TaskBase {
    telegram_id?: number;
    telegram_username?: string;
    link: string;
    platform: number;
    type: number;
}

export interface ITasksReferrals extends TaskBase {
    threshold: number;
}

export interface ITasksAds extends TaskBase {
    telegram_id?: number;
    telegram_username?: string;
    link: string;
    type: number;
    image_url?: string;
    platform?: number;
    expireAt: Date;
}