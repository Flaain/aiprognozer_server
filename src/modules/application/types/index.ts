import mongoose, { HydratedDocument, SchemaTimestampsConfig } from 'mongoose';
import { APPLICATION_STATUS } from '../constants';
import { Application } from '../schemas/application.schema';

export type ApplicationStatus = typeof APPLICATION_STATUS[keyof typeof APPLICATION_STATUS];
export type ApplicationDocument = HydratedDocument<Application> & SchemaTimestampsConfig;

export interface IApplication {
    userId: mongoose.Types.ObjectId;
    one_win_name: string;
    status: 'pending' | 'approved';
}

export interface SendApplicationDTO {
    one_win_name: string;
}