import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { ClientSession, Model, QueryOptions, RootFilterQuery, UpdateQuery } from 'mongoose';
import { ms } from 'src/shared/utils/ms';
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

    createUser = (telegram_id: number) => this.userModel.create({ telegram_id });

    createReferall = (onewin_id: number) => this.referallsModel.create({ onewin_id });

    findOneAndUpdateUser = (filter?: RootFilterQuery<User>, update?: UpdateQuery<User>, options?: QueryOptions<User>) => this.userModel.findOneAndUpdate(filter, update, options);

    resetRequestCount = () => {
        return this.userModel.updateMany(
            {
                $expr: {
                    $and: [
                        { $ne: ['$request_count', 0] },
                        { $ifNull: ['$first_request_at', false] },
                        { $lt: [{ $add: ['$first_request_at', ms('24h')] }, new Date()] }, 
                    ],
                },
            },
            [
                { $set: { request_count: 0 } },
                { $unset: 'first_request_at' }
            ],
        );
    }

    userExists = (filter: RootFilterQuery<User>) => this.userModel.exists(filter);

    referallExists = (filter: RootFilterQuery<Referalls>) => this.referallsModel.exists(filter);

    findReferall = (onewin_id: number, session?: ClientSession) => this.referallsModel.findOne({ onewin_id }, { user_id: 1 }, { session });
}
