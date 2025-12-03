import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { ClientSession, Model, ProjectionType, QueryOptions, RootFilterQuery, Types, UpdateQuery } from 'mongoose';
import { Referalls } from './schemas/referall.schema';
import { UserDocument } from './types/types';

@Injectable()
export class UserRepository {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<User>,
        @InjectModel(Referalls.name) private readonly referallsModel: Model<Referalls>,
    ) {}

    findUserByTelegramId = (id: number) => this.userModel.findOne({ telegram_id: id });

    findOrCreateUserByTelegramId = (telegram_id: number) => this.userModel.findOneAndUpdate<UserDocument>(
        { telegram_id },
        { $setOnInsert: { request_count: 0 } },
        { new: true, upsert: true, includeResultMetadata: true },
    );

    findById = (id: string | Types.ObjectId, projection?: ProjectionType<User>, options?: QueryOptions<User>) => this.userModel.findById(id, projection, options);

    createUser = (telegram_id: number) => this.userModel.create({ telegram_id });

    createReferall = (onewin_id: number) => this.referallsModel.create({ onewin_id });

    findOneAndUpdateUser = (filter?: RootFilterQuery<User>, update?: UpdateQuery<User>, options?: QueryOptions<User>) => this.userModel.findOneAndUpdate(filter, update, options);

    userExists = (filter: RootFilterQuery<User>) => this.userModel.exists(filter);

    referallExists = (filter: RootFilterQuery<Referalls>) => this.referallsModel.exists(filter);

    findReferall = (onewin_id: number, session?: ClientSession) => this.referallsModel.findOne({ onewin_id }, { user_id: 1 }, { session });

    exists = (filter: RootFilterQuery<User>) => this.userModel.exists(filter);
}
