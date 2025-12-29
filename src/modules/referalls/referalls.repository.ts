import { Injectable } from '@nestjs/common';
import { AggregateOptions, ClientSession, Model, PipelineStage, ProjectionType, QueryOptions, RootFilterQuery, Types, UpdateQuery } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Referalls } from './schemas/referalls.schema';

@Injectable()
export class ReferallsRepository {
    constructor(@InjectModel(Referalls.name) private readonly referallsModel: Model<Referalls>) {}

    createUserReferralCode = async (userId: Types.ObjectId, code: string, session?: ClientSession) => this.referallsModel.create([{ code, user_id: userId }], { session });

    findReferallCode = (code: string, session?: ClientSession) => this.referallsModel.findOne({ code }, undefined, { session });

    findOneAndUpdateCode = (filter?: RootFilterQuery<Referalls>, update?: UpdateQuery<Referalls>, options?: QueryOptions<Referalls>) => this.referallsModel.findOneAndUpdate(filter, update, options);

    findOne = (filter: RootFilterQuery<Referalls>, projection?: ProjectionType<Referalls>, options?: QueryOptions<Referalls>) => this.referallsModel.findOne(filter, projection, options);

    aggregate = (pipeline: Array<PipelineStage>, options?: AggregateOptions) => this.referallsModel.aggregate(pipeline, options);
}