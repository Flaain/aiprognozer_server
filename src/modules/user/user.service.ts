import { ConflictException, HttpStatus, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { PostbackType, UserDocument, WebAppUser } from './types/types';
import { ClientSession, Connection, ProjectionType, QueryOptions, RootFilterQuery, Types } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { defaultResponse, PROVIDERS } from 'src/shared/constants';
import { ConfigService } from '@nestjs/config';
import { AppException } from 'src/shared/exceptions/app.exception';
import { User } from './schemas/user.schema';
import { ProductEffect } from '../product/types';
import { ms } from 'src/shared/utils/ms';
import { escapeMD } from 'src/shared/utils/escapeMD';
import { ReferralsService } from '../referrals/referrals.service';
import { DEFAULT_REQUEST_LIMIT_REFERRAL_REWARD, PREMIUM_REQUEST_LIMIT_REFERRAL_REWARD } from '../referrals/constants';
import { REFERRALS_BATCH } from './constants';
import { TgBot } from '../tg/types';

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);
    private readonly isProduction: Boolean;

    constructor(
        @InjectConnection() private readonly connection: Connection,
        @Inject(PROVIDERS.TG_BOT) private readonly tgBot: TgBot,
        private readonly configService: ConfigService,
        private readonly userRepository: UserRepository,
        private readonly referralsService: ReferralsService,
    ) {
        this.isProduction = configService.getOrThrow<string>('NODE_ENV') === 'production';
    }

    public verify = async (user: UserDocument, onewin_id: number) => {
        if (user.isVerified) throw new AppException({ message: 'User already verified', errorCode: 'ALREADY_VERIFIED' }, HttpStatus.BAD_REQUEST);

        const session = await this.connection.startSession();

        session.startTransaction();

        try {
            const onewinReferral = await this.userRepository.findOneWinReferral(onewin_id, session);

            if (!onewinReferral) throw new AppException({ message: 'Referral not found', errorCode: 'REFERRAL_NOT_EXISTS' }, HttpStatus.NOT_FOUND);
            
            if (onewinReferral.user_id) throw new AppException({ message: 'Referral already verified', errorCode: 'REFERRAL_ALREADY_TAKEN' }, HttpStatus.BAD_REQUEST);

            await this.referralsService.createUserReferralCode(user._id, session);
            
            await user.updateOne({ isVerified: true, onewin: onewinReferral._id }, { session });
            await onewinReferral.updateOne({ user_id: user._id }, { session });

            const invitedByRef = user.invitedBy ? await this.referralsService.findOneAndUpdateCode(
                { _id: user.invitedBy },
                { $inc: { total_verified: 1 } },
                { session, new: true },
            ) : undefined;

            if (invitedByRef?.user_id) {
                const reward = user.isPremium ? PREMIUM_REQUEST_LIMIT_REFERRAL_REWARD : DEFAULT_REQUEST_LIMIT_REFERRAL_REWARD;

                await this.userRepository.findOneAndUpdateUser(
                    { _id: invitedByRef.user_id },
                    { $inc: { request_limit: reward } },
                    { session },
                );
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
        if (await this.userRepository.referralExists({ onewin_id })) throw new ConflictException('Provided onewin id already exists');

        await this.userRepository.createOneWinReferral(onewin_id);

        this.tgBot.api
            .sendMessage(
                this.configService.getOrThrow<number>('NEW_LEED_GROUP_ID'),
                `*📣 Новая регистрация!*\n\n🆔 ID: ${onewin_id}\n🌍 Страна: ${country}\n${type === 'PROMO' ? '🎟️ Промокод' : '🔗 Ссылка'}: ${name}`,
                { parse_mode: 'Markdown' },
            )
            .catch((error) => {
                this.logger.error(`Failed to notify about new leed: ${error}`);
            });

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
        let user = null;

        const userFields = {
            name: webAppUser.first_name,
            username: webAppUser.username,
            language_code: webAppUser.language_code,
            photo_url: webAppUser.photo_url,
            isPremium: webAppUser.is_premium ?? false,
        };

        user = await this.userRepository.findOneAndUpdateUser(
            { telegram_id: webAppUser.id }, 
            userFields, 
            { projection: { onewin: 0, invitedBy: 0, telegram_id: 0, total_requests: 0, total_tasks_earned: 0 }, new: true }
        );

        if (!user) {
            if (ref && ctx === 'http') {
                const session = await this.connection.startSession();

                session.startTransaction();

                try {
                    const invitedByRef = await this.referralsService.findOneAndUpdateCode(
                        { code: ref }, 
                        { $inc: { total_count: 1 } }, 
                        { session }
                    );

                    if (!invitedByRef) {
                        this.logger.warn(`While creating user ${webAppUser.id} inviter document with code ${ref} was not found`);
                    };

                    user = (
                        await this.userRepository.createUser(
                            { ...userFields, telegram_id: webAppUser.id, invitedBy: invitedByRef?._id },
                            session,
                        )
                    )[0];

                    await session.commitTransaction();
                } catch (error) {
                    await session.abortTransaction();
                    
                    throw error;
                } finally {
                    session.endSession();
                }
            } else {
                user = await this.userRepository.createUser({ ...userFields, telegram_id: webAppUser.id });
            }

            this.tgBot.api
                .sendMessage(
                    this.configService.getOrThrow<string>('NEW_USERS_GROUP_ID'),
                    `*🚀 Новый пользователь!*\n\n👤 Имя: ${escapeMD(webAppUser.first_name)}\n📧 Username: @${webAppUser.username ? escapeMD(webAppUser.username) : 'без юзернейма'}\n🆔 ID: ${webAppUser.id}`,
                    { parse_mode: 'Markdown', disable_notification: !this.isProduction },
                )
                .catch((error) => {
                    this.logger.error(`Failed to notify about new user: ${error}`);
                });
        }

        if (user.first_request_at && Date.now() > +new Date(user.first_request_at) + ms('24h')) {
            user.request_count = 0;
            user.first_request_at = undefined;

            await user.save();
        }

        const { telegram_id, __v, onewin, invitedBy, total_requests, total_tasks_earned, ...rest } = user.toObject();

        return rest;
    };

    public referrals = async (userId: Types.ObjectId, cursor?: string) => {
        const referralCode = await this.referralsService.findOne({ user_id: userId });

        if (!referralCode) throw new NotFoundException('Referral code not found');

        const referrals = (await this.userRepository.aggregate([
            {
                $match: {
                    invitedBy: referralCode._id,
                    ...(cursor && { _id: { $lt: new Types.ObjectId(cursor) } }),
                },
            },
            { $sort: { createdAt: -1 } },
            {
                $facet: {
                    items: [
                        { $limit: REFERRALS_BATCH + 1 },
                        { $project: { name: 1, isVerified: 1, createdAt: 1, telegram_id: 1 } },
                    ],
                },
            },
            {
                $project: {
                    items: {
                        $slice: ['$items', REFERRALS_BATCH]
                    },
                    meta: {
                        hasMore: { $gt: [{ $size: '$items' }, REFERRALS_BATCH] },
                        perPage: { $literal: REFERRALS_BATCH },
                        nextCursor: {
                            $cond: {
                                if: { $gt: [{ $size: '$items' }, REFERRALS_BATCH] },
                                then: { $toString: { $arrayElemAt: ['$items._id', REFERRALS_BATCH - 1] } },
                                else: null,
                            }
                        }
                    }
                }
            }
        ]))[0];

        return {
            referrals,
            ...(!cursor && {
                rewards: {
                    request_limit: {
                        default: DEFAULT_REQUEST_LIMIT_REFERRAL_REWARD,
                        premium: PREMIUM_REQUEST_LIMIT_REFERRAL_REWARD,
                    },
                },
                code: referralCode.code,
            }),
        };
    }

    public generatePreparedMessage = async (telegram_id: number, userId: Types.ObjectId) => {
        const ref = await this.referralsService.findOne({ user_id: userId });

        if (!ref) throw new NotFoundException('Referral code not found');

        const preparedMessage = await this.tgBot.api.savePreparedInlineMessage(
            telegram_id,
            {
                type: 'photo',
                id: `invite_message_${telegram_id}`,
                title: 'Invite',
                photo_url: this.configService.getOrThrow<string>('INVITE_IMAGE_URL'),
                thumbnail_url: this.configService.getOrThrow<string>('INVITE_IMAGE_URL'),
                caption: '*Искусственный интеллект для анализа спортивных событий*\n\nНашел бота, который на основе ИИ анализирует спортивные события, загружаешь событие — он выдает четкий разбор с прогнозом и рекомендованными исходами.\n\n_Хватит полагаться на удачу, пора довериться цифрам, так-как они не лгут._',
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: 'Начать анализ',
                                url: `https://t.me/${this.configService.getOrThrow<string>('BOT_USERNAME')}?startapp=${ref.code}`,
                            },
                        ],
                    ],
                },
            },
            { allow_channel_chats: true, allow_user_chats: true, allow_group_chats: true },
        );

        return preparedMessage.id;
    }
}