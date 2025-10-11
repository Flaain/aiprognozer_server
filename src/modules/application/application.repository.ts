import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Application } from './schemas/application.schema';
import { Model, ProjectionType, QueryOptions, RootFilterQuery, Types } from 'mongoose';
import { ApplicationDocument } from './types';
import { Abortable } from 'mongodb';

@Injectable()
export class ApplicationRepository {
    constructor(@InjectModel(Application.name) private readonly model: Model<ApplicationDocument>) {}

    create = (body: Application | [Application], options?: any) => this.model.create(body, options);

    exists = (filter: RootFilterQuery<Application>) => this.model.exists(filter);

    find = (
        filter: RootFilterQuery<Application>,
        projection?: ProjectionType<Application> | null | undefined,
        options?: (QueryOptions<AlphaOption> & Abortable) | null | undefined,
    ) => this.model.find(filter, projection, options);

    findOne = (
        filter: RootFilterQuery<Application>,
        projection?: ProjectionType<Application>,
        options?: QueryOptions<Application>,
    ) => this.model.findOne(filter, projection, options);

    createManyFakeApplications = (userId: Types.ObjectId) => this.model.insertMany([
        { userId, onewin_id: 123, status: 'pending' },
        { userId, onewin_id: 123, status: 'pending' },
        { userId, onewin_id: 123, status: 'pending' },
        { userId, onewin_id: 123, status: 'pending' },
        { userId, onewin_id: 123, status: 'pending' },
        { userId, onewin_id: 123, status: 'pending' },
        { userId, onewin_id: 123, status: 'pending' },
        { userId, onewin_id: 123, status: 'pending' },
        { userId, onewin_id: 123, status: 'pending' },
        { userId, onewin_id: 123, status: 'pending' },
        { userId, onewin_id: 123, status: 'pending' },
        { userId, onewin_id: 123, status: 'pending' },
        { userId, onewin_id: 123, status: 'pending' },
        { userId, onewin_id: 123, status: 'pending' },
        { userId, onewin_id: 123, status: 'pending' },
        { userId, onewin_id: 123, status: 'pending' },
        { userId, onewin_id: 123, status: 'pending' },
        { userId, onewin_id: 123, status: 'pending' },
        { userId, onewin_id: 123, status: 'pending' },
        { userId, onewin_id: 123, status: 'pending' },
    ])

    count = (filter?: RootFilterQuery<ApplicationDocument>) => this.model.countDocuments(filter);
}
