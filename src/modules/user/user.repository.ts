import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { AggregateOptions, ClientSession, Model, PipelineStage, ProjectionType, QueryOptions, RootFilterQuery, Types, UpdateQuery } from 'mongoose';
import { OneWinReferalls } from './schemas/onewin.referall.schema';
import { UserDocument } from './types/types';

@Injectable()
export class UserRepository {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<User>,
        @InjectModel(OneWinReferalls.name) private readonly onewinReferallsModel: Model<OneWinReferalls>,
    ) {}

    findUserByTelegramId = (id: number) => this.userModel.findOne({ telegram_id: id });

    findOrCreateUserByTelegramId = (telegram_id: number, update?: UpdateQuery<User>) => this.userModel.findOneAndUpdate<UserDocument & { onewin: { onewin_id: number } }>({ telegram_id }, update, { new: true, upsert: true, includeResultMetadata: true });

    findById = (id: string | Types.ObjectId, projection?: ProjectionType<User>, options?: QueryOptions<User>) => this.userModel.findById(id, projection, options);

    createUser = (fields: Partial<User>, session?: ClientSession) => session ? this.userModel.create([fields], { session }) : this.userModel.create(fields);

    createOneWinReferall = (onewin_id: number) => this.onewinReferallsModel.create({ onewin_id });

    findOneAndUpdateUser = (filter?: RootFilterQuery<User>, update?: UpdateQuery<User>, options?: QueryOptions<User>) => this.userModel.findOneAndUpdate<UserDocument>(filter, update, options);

    userExists = (filter: RootFilterQuery<User>) => this.userModel.exists(filter);

    referallExists = (filter: RootFilterQuery<OneWinReferalls>) => this.onewinReferallsModel.exists(filter);

    findOneWinReferall = (onewin_id: number, session?: ClientSession) => this.onewinReferallsModel.findOne({ onewin_id }, { user_id: 1 }, { session });

    exists = (filter: RootFilterQuery<User>) => this.userModel.exists(filter);

    aggregate = (pipeline: Array<PipelineStage>, options?: AggregateOptions) => this.userModel.aggregate(pipeline, options);
}