import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Application } from './schemas/application.schema';
import { Model, ProjectionType, QueryOptions, RootFilterQuery } from 'mongoose';
import { ApplicationDocument } from './types';

@Injectable()
export class ApplicationRepository {
    constructor(@InjectModel(Application.name) private readonly model: Model<ApplicationDocument>) {}

    create = (body: Application | [Application], options?: any) => this.model.create(body, options);

    exists = (filter: RootFilterQuery<Application>) => this.model.exists(filter);

    findOne = (filter: RootFilterQuery<Application>, projection?: ProjectionType<Application>, options?: QueryOptions<Application>) => this.model.findOne(filter, projection, options);
}
