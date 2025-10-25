import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PostbackType, UserDocument } from './types/types';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { defaultResponse, PROVIDERS } from 'src/shared/constants';
import { Bot } from 'grammy';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        @InjectConnection() private readonly connection: Connection,
        @Inject(PROVIDERS.TG_BOT) private readonly tgBot: Bot,
        private readonly configService: ConfigService,
        private readonly userRepository: UserRepository,
    ) {}

    @Cron(CronExpression.EVERY_5_MINUTES)
    private async resetRequestCount() {
        try {
            const { matchedCount } = await this.userRepository.resetRequestCount();

            this.logger.log(`Cron job resetRequestCount success, updated users: ${matchedCount}`);
        } catch (error) {
            this.logger.error(`Cron job resetRequestCount error: ${error}`);
        }
    }

    public verify = async (user: UserDocument, onewin_id: number) => {
        if (user.isVerified) throw new BadRequestException('User already verified');

        const session = await this.connection.startSession();

        session.startTransaction();

        try {
            const referall = await this.userRepository.findReferall(onewin_id, session);

            if (!referall) throw new BadRequestException('REFERALL_NOT_EXISTS');

            if (referall.user_id) throw new ConflictException('REFERALL_ALREADY_TAKEN');

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

        this.tgBot.api.sendMessage(
            this.configService.getOrThrow<number>('NEW_LEED_GROUP_ID'),
            `*📣 Новая регистрация!*\n\n🆔 ID: ${onewin_id}\n🌍 Страна: ${country}\n${type === 'PROMO' ? '🎟️ Промокод' : '🔗 Ссылка'}: ${name}`,
            { parse_mode: 'Markdown' }
        );
        
        return defaultResponse;
    };
}
