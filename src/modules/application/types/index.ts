import { HydratedDocument, SchemaTimestampsConfig, Types } from 'mongoose';
import { APPLICATION_STATUS } from '../constants';
import { Application } from '../schemas/application.schema';

export type ApplicationStatus = (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS];
export type ApplicationDocument = HydratedDocument<Application> & SchemaTimestampsConfig;

export interface IApplication {
    userId: Types.ObjectId;
    onewin_id: number;
    status: 'pending' | 'approved';
}

export interface SendApplicationDTO {
    onewin_id: number;
}

export interface GetApplicationsReturn {
    totalPages: number;
    applications: Array<Pick<Application, 'onewin_id'> & { _id: Types.ObjectId }>;
    currentPage: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
}