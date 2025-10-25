import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { ClientSession, Model, QueryOptions, RootFilterQuery, UpdateQuery } from 'mongoose';
import { ms } from 'src/shared/utils/ms';
import { Referalls } from './schemas/referall.schema';

@Injectable()
export class UserRepository {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<User>,
        @InjectModel(Referalls.name) private readonly referallsModel: Model<Referalls>
    ) {}

    findUserByTelegramId = (id: number) => this.userModel.findOne({ telegram_id: id }, { last_request_at: 0, telegram_id: 0 });

    findOrCreateUserByTelegramId = (telegram_id: number) => this.userModel.findOneAndUpdate(
        { telegram_id },
        { $setOnInsert: { last_request_at: new Date(), request_count: 10 } },
        { new: true, upsert: true, includeResultMetadata: true,  },
    );

    createUser = (telegram_id: number) => this.userModel.create({ telegram_id });
    
    createReferall = (onewin_id: number) => this.referallsModel.create({ onewin_id });

    findOneAndUpdateUser = (filter?: RootFilterQuery<User>, update?: UpdateQuery<User>, options?: QueryOptions<User>) => this.userModel.findOneAndUpdate(filter, update, options);

    resetRequestCount = () => this.userModel.updateMany(
        { request_count: { $eq: 0 }, last_request_at: { $lt: new Date(+new Date() - ms('24h')) } },
        { $set: { request_count: 10 } },
    );

    userExists = (filter: RootFilterQuery<User>) => this.userModel.exists(filter);

    referallExists = (filter: RootFilterQuery<Referalls>) => this.referallsModel.exists(filter);

    findReferall = (onewin_id: number, session?: ClientSession) => this.referallsModel.findOne({ onewin_id }, { user_id: 1 }, { session });
}
