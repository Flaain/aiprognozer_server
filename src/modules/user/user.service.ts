import { ConflictException, HttpStatus, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { PostbackType, ToObjectUser, UserDocument, WebAppUser } from './types/types';
import { ClientSession, Connection, ProjectionType, QueryOptions, RootFilterQuery, Types } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { defaultResponse, PROVIDERS } from 'src/shared/constants';
import { ConfigService } from '@nestjs/config';
import { AppException } from 'src/shared/exceptions/app.exception';
import { TgProvider } from '../tg/types';
import { User } from './schemas/user.schema';
import { ProductEffect } from '../product/types';
import { ReferallsService } from '../referalls/referalls.service';
import { DEFAULT_REQUEST_LIMIT_REFERALL_REWARD, PREMIUM_REQUEST_LIMIT_REFERALL_REWARD } from '../referalls/constants';
import { escapeMD } from 'src/shared/utils/escapeMD';
import { ms } from 'src/shared/utils/ms';
import { getReferallsPipeLine } from './utils/getReferallsPipeline';

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);
    private readonly isProduction: Boolean;

    constructor(
        @InjectConnection() private readonly connection: Connection,
        @Inject(PROVIDERS.TG_PROVIDER) private readonly tgProvider: TgProvider,
        private readonly configService: ConfigService,
        private readonly userRepository: UserRepository,
        private readonly referallsService: ReferallsService,
    ) {
        this.isProduction = configService.getOrThrow<string>('NODE_ENV') === 'production';
    }

    public verify = async (user: UserDocument, onewin_id: number) => {
        if (user.isVerified) throw new AppException({ message: 'User already verified', errorCode: 'ALREADY_VERIFIED' }, HttpStatus.BAD_REQUEST);

        const session = await this.connection.startSession();

        session.startTransaction();

        try {
            const onewinReferall = await this.userRepository.findOneWinReferall(onewin_id, session);

            if (!onewinReferall) throw new AppException({ message: 'Referall not found', errorCode: 'REFERALL_NOT_EXISTS' }, HttpStatus.NOT_FOUND);
            
            if (onewinReferall.user_id) throw new AppException({ message: 'Referall already verified', errorCode: 'REFERALL_ALREADY_TAKEN' }, HttpStatus.BAD_REQUEST);

            await this.referallsService.createUserReferralCode(user._id, session)
            
            await user.updateOne({ isVerified: true, onewin: onewinReferall._id }, { session });
            await onewinReferall.updateOne({ user_id: user._id }, { session });

            const invitedByRef = user.invitedBy ? await this.referallsService.findOneAndUpdateCode(
                { _id: user.invitedBy },
                { $inc: { total_count: 1, ...(user.isPremium && { premium_count: 1 }) } },
                { session, returnDocument: 'after' },
            ) : undefined;

            if (invitedByRef?.user_id) {
                const reward = user.isPremium ? PREMIUM_REQUEST_LIMIT_REFERALL_REWARD : DEFAULT_REQUEST_LIMIT_REFERALL_REWARD;

                await this.userRepository.findOneAndUpdateUser(
                    { _id: invitedByRef.user_id },
                    { $inc: { request_limit: reward } },
                    { session, projection: { telegram_id: 1, request_limit: 1 }, returnDocument: 'after' },
                );

                // await this.tgProvider.bot.api.sendMessage(
                //     inviter.telegram_id,
                //     `*У вас новый реферал!*\n\nВаш лимит запросов был увеличен на — ${reward}\nНовый лимит — ${inviter.request_limit}\n\n*Ваша статистика*:\n\n• Всего рефералов: ${invitedByRef.total_count}\n\n*Актуальная ссылка*: \`https://t.me/${this.configService.getOrThrow<string>('BOT_USERNAME')}?startapp=${invitedByRef.code}\``,
                //     {
                //         parse_mode: 'Markdown',
                //     },
                // );
            }

            await session.commitTransaction();

            return defaultResponse;
        } catch (error) {
            this.logger.error(error);

            await session.abortTransaction();

            throw error;
        } finally {
            session.endSession();
        }
    };

    public postback = async ({ onewin_id, country, type, name }: { onewin_id: number; country: string; type: PostbackType; name: string }) => {
        if (await this.userRepository.referallExists({ onewin_id })) throw new ConflictException('Provided onewin id already exists');

        await this.userRepository.createOneWinReferall(onewin_id);

        this.tgProvider.bot.api.sendMessage(
            this.configService.getOrThrow<number>('NEW_LEED_GROUP_ID'),
            `*📣 Новая регистрация!*\n\n🆔 ID: ${onewin_id}\n🌍 Страна: ${country}\n${type === 'PROMO' ? '🎟️ Промокод' : '🔗 Ссылка'}: ${name}`,
            { parse_mode: 'Markdown' },
        );

        return defaultResponse;
    };

    public findById = async (id: string | Types.ObjectId, projection?: ProjectionType<User>, options?: QueryOptions<User>) => {
        const user = await this.userRepository.findById(id, projection, options);

        if (!user) throw new NotFoundException('User not found');

        return user;
    };

    public findByTelegramId = async (telegram_id: number) => this.userRepository.findUserByTelegramId(telegram_id);

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
    };

    public removeProductEffect = async (user: UserDocument, effect: Array<ProductEffect>, refundedAt: Date, session?: ClientSession) => {
        const toObjectUser = user.toObject();

        for (const { effect_type, target, value } of effect.filter(({ target }) => toObjectUser.hasOwnProperty(target))) {
            const isNums = typeof user[target] === 'number' && typeof value === 'number';

            switch (effect_type) {
                case 'inc':
                    if (isNums) {
                        if (target === 'request_limit') {
                            user.request_limit -= value;
                            user.request_count = Math.min(user.request_count, user.request_limit);
                        } else {
                            user[target] -= value;
                        }
                    }
                    break;
                case 'dec':
                    isNums && (user[target] += value);
                    break;
                case 'reset':
                    if (target === 'request_count') {
                        user.request_count = user.request_limit;
                        user.first_request_at = refundedAt;
                    } else {
                        user[target] = 0;
                    }
                    break;
            }
        }

        await user.save({ session });
    };

    public isExists = async (filter: RootFilterQuery<User>) => this.userRepository.exists(filter);

    public findOrCreateUserByTelegramId = async (webAppUser: WebAppUser, ctx: 'http' | 'bot', ref?: string) => {
        const invitedByRef = ref && ctx === 'http' ? await this.referallsService.findOne({ code: ref }, undefined) : undefined;

        const { value, lastErrorObject } = await this.userRepository.findOrCreateUserByTelegramId(webAppUser.id, {
            name: webAppUser.first_name,
            username: webAppUser.username,
            language_code: webAppUser.language_code,
            photo_url: webAppUser.photo_url,
            isPremium: webAppUser.is_premium ?? false,
            $setOnInsert: { invitedBy: invitedByRef?._id },
        });

        if (!lastErrorObject.updatedExisting) {
            this.tgProvider.bot.api.sendMessage(
                this.configService.getOrThrow<string>('NEW_USERS_GROUP_ID'),
                `*🚀 Новый пользователь!*\n\n👤 Имя: ${escapeMD(webAppUser.first_name)}\n📧 Username: @${escapeMD(webAppUser.username) || 'без юзернейма'}\n🆔 ID: ${webAppUser.id}`,
                { parse_mode: 'Markdown', disable_notification: !this.isProduction },
            );
        } else {
            if (value.first_request_at && Date.now() > +new Date(value.first_request_at) + ms('24h')) {
                value.request_count = 0;
                value.first_request_at = undefined;

                await value.save();
            }
        }

        const { telegram_id, __v, invitedBy, onewin, ...user } = value.toObject<ToObjectUser>();

        return onewin ? { ...user, onewin_id: onewin.onewin_id } : user;
    };

    public referalls = async (userId: Types.ObjectId, cursor?: string) => {
        const referallCode = await this.referallsService.findOne({ user_id: userId });

        if (!referallCode) throw new NotFoundException('Referall code not found');

        const referalls = (await this.userRepository.aggregate(getReferallsPipeLine(referallCode._id, cursor)))[0]

        return cursor
            ? referalls
            : {
                  rewards: {
                      request_limit: {
                          default: DEFAULT_REQUEST_LIMIT_REFERALL_REWARD,
                          premium: PREMIUM_REQUEST_LIMIT_REFERALL_REWARD,
                      },
                  },
                  code: referallCode.code,
                  referalls,
              };
    }
}