import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model, QueryOptions, RootFilterQuery, UpdateQuery } from 'mongoose';
import { ms } from 'src/shared/utils/ms';

@Injectable()
export class UserRepository {
    constructor(@InjectModel(User.name) private readonly model: Model<User>) {}

    findUserByTelegramId = (id: number) => this.model.findOne({ telegram_id: id }, { last_request_at: 0, telegram_id: 0 });

    findOrCreateUserByTelegramId = (filter: RootFilterQuery<User>, update: UpdateQuery<User>, options?: QueryOptions<User>) => this.model.findOneAndUpdate(filter, update, options);

    createUser = (telegram_id: number) => this.model.create({ telegram_id });

    findOneAndUpdate = (filter?: RootFilterQuery<User>, update?: UpdateQuery<User>, options?: QueryOptions<User>) => this.model.findOneAndUpdate(filter, update, options)

    resetRequestCount = () => this.model.updateMany(
        { request_count: { $eq: 0 }, last_request_at: { $lt: new Date(+new Date() - ms('24h')) } },
        { $set: { request_count: 10 } }
    )
}