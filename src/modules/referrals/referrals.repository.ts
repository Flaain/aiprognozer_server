import { Injectable } from '@nestjs/common';
import { AggregateOptions, ClientSession, Model, PipelineStage, ProjectionType, QueryOptions, RootFilterQuery, Types, UpdateQuery } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Referrals } from './schemas/referrals.schema';

@Injectable()
export class ReferralsRepository {
    constructor(@InjectModel(Referrals.name) private readonly referralsModel: Model<Referrals>) {}

    createUserReferralCode = async (userId: Types.ObjectId, code: string, session?: ClientSession) => this.referralsModel.create([{ code, user_id: userId }], { session });

    findById = (id: Types.ObjectId, projection?: ProjectionType<Referrals>, options?: QueryOptions<Referrals>) => this.referralsModel.findById(id, projection, options);

    findReferralCode = (code: string, session?: ClientSession) => this.referralsModel.findOne({ code }, undefined, { session });

    findOneAndUpdateCode = (filter?: RootFilterQuery<Referrals>, update?: UpdateQuery<Referrals>, options?: QueryOptions<Referrals>) => this.referralsModel.findOneAndUpdate(filter, update, options);

    findOne = (filter: RootFilterQuery<Referrals>, projection?: ProjectionType<Referrals>, options?: QueryOptions<Referrals>) => this.referralsModel.findOne(filter, projection, options);

    aggregate = (pipeline: Array<PipelineStage>, options?: AggregateOptions) => this.referralsModel.aggregate(pipeline, options);
}