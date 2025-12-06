import { ConflictException, HttpStatus, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { PostbackType, UserDocument } from './types/types';
import { ClientSession, Connection, ProjectionType, QueryOptions, RootFilterQuery, Types } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { defaultResponse, PROVIDERS } from 'src/shared/constants';
import { ConfigService } from '@nestjs/config';
import { AppException } from 'src/shared/exceptions/app.exception';
import { TgProvider } from '../tg/types';
import { User } from './schemas/user.schema';
import { ProductEffect } from '../product/types';

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        @InjectConnection() private readonly connection: Connection,
        @Inject(PROVIDERS.TG_PROVIDER) private readonly tgProvider: TgProvider,
        private readonly configService: ConfigService,
        private readonly userRepository: UserRepository,
    ) {}

    public verify = async (user: UserDocument, onewin_id: number) => {
        if (user.isVerified) throw new AppException({ message: 'User already verified', errorCode: 'ALREADY_VERIFIED' }, HttpStatus.BAD_REQUEST);

        const session = await this.connection.startSession();

        session.startTransaction();

        try {
            const referall = await this.userRepository.findReferall(onewin_id, session);

            if (!referall) throw new AppException({ message: 'Referall not found', errorCode: 'REFERALL_NOT_EXISTS' }, HttpStatus.NOT_FOUND);
            if (referall.user_id) throw new AppException({ message: 'Referall already verified', errorCode: 'REFERALL_ALREADY_TAKEN' }, HttpStatus.BAD_REQUEST);

            await user.updateOne({ isVerified: true, referall: referall._id }, { session });
            await referall.updateOne({ user_id: user._id }, { session });

            await session.commitTransaction();

            return defaultResponse;
        } catch (error) {
            await session.abortTransaction();

            throw error;
        } finally {
            session.endSession();
        }
    };

    public postback = async ({ onewin_id, country, type, name }: { onewin_id: number; country: string; type: PostbackType; name: string }) => {
        if (await this.userRepository.referallExists({ onewin_id })) throw new ConflictException('Provided onewin id already exists');

        await this.userRepository.createReferall(onewin_id);

        this.tgProvider.bot.api.sendMessage(
            this.configService.getOrThrow<number>('NEW_LEED_GROUP_ID'),
            `*📣 Новая регистрация!*\n\n🆔 ID: ${onewin_id}\n🌍 Страна: ${country}\n${type === 'PROMO' ? '🎟️ Промокод' : '🔗 Ссылка'}: ${name}`,
            { parse_mode: 'Markdown' }
        );
        
        return defaultResponse;
    };

    public findById = async (id: string | Types.ObjectId, projection?: ProjectionType<User>, options?: QueryOptions<User>) => {
        const user = await this.userRepository.findById(id, projection, options);

        if (!user) throw new NotFoundException('User not found');

        return user;
    }

    public applyProductEffect = async (user: UserDocument, effect: Array<ProductEffect>, session?: ClientSession) => {
        const toObjectUser = user.toObject();

        for (const { effect_type, target, value } of effect.filter(({ target }) => toObjectUser.hasOwnProperty(target))) {
            const isNums = typeof user[target] === 'number' && typeof value === 'number';

            switch (effect_type) {
                case 'inc':
                    isNums && (user[target] += value);
                    break;
                case 'dec':
                    isNums && (user[target] -= value);
                    break;
                case 'reset':
                    user[target] = 0;
                    break;
                case 'set':
                    user[target] = value;
                    break;
            }
        }

        await user.save({ session });
    }

    public removeProductEffect = async (user: UserDocument, effect: Array<ProductEffect>, session?: ClientSession) => {
        const toObjectUser = user.toObject();

        for (const { effect_type, target, value } of effect.filter(({ target }) => toObjectUser.hasOwnProperty(target))) {
            const isNums = typeof user[target] === 'number' && typeof value === 'number';

            switch (effect_type) {
                case 'inc':
                    isNums && (user[target] -= value);
                    break;
                case 'dec':
                    isNums && (user[target] += value);
                    break;
                case 'reset':
                    user[target] = target === 'request_count' ? user.request_limit : 0;
                    break;
            }
        }

        await user.save({ session });
    }

    public isExists = async (filter: RootFilterQuery<User>) => this.userRepository.exists(filter);
}
