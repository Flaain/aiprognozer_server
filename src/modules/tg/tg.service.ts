import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, CommandContext, Context, BotError, InlineKeyboard, GrammyError, HttpError } from 'grammy';
import { bot_commands } from './constants';
import { WebAppUser } from '../user/types/types';
import { UserRepository } from '../user/user.repository';
import { limit } from "@grammyjs/ratelimiter";
import { PROVIDERS } from 'src/shared/constants';
import { readFile } from 'node:fs';
import { ConversationFlavor, conversations } from '@grammyjs/conversations';

@Injectable()
export class TgService {
    private readonly logger = new Logger(TgService.name);
    private readonly isProduction: boolean;

    constructor(
        @Inject(PROVIDERS.TG_BOT) private readonly tgBot: Bot<ConversationFlavor<Context>>,
        private readonly configService: ConfigService,
        private readonly userRepository: UserRepository,
    ) {
        this.isProduction = configService.getOrThrow<string>('NODE_ENV') === 'production';

        this.init();
    }

    private onStart = async (ctx: CommandContext<Context>) => {
        if (!ctx.from) return;

        readFile('./link.txt', async (error, data) => {
            if (error) {
                this.logger.error(error);
                // call sentry
                return;
            }

            const { lastErrorObject }: any = await this.userRepository.findOrCreateUserByTelegramId(ctx.from.id);

            ctx.reply(
                `*Добро пожаловать, ${ctx.from.first_name}!*\n\nЯ — ваш персональный ИИ-аналитик для ставок на спорт. Моя задача — помогать вам ориентироваться в мире спортивных событий. Вот что я делаю:\n\n1. Анализирую статистику и актуальные данные.\n2. Оцениваю риски, рассчитываю вероятности исходов.\n3. Формирую краткие прогнозы, которые могут быть полезны при выборе ставки.\n\nЧтобы разблокировать доступ к моим прогнозам, зарегистрируйтесь по реферальной ссылке ниже, это обязательно и займет всего минуту! \n\n${data.toString()}\n\nГотовы? Выберите матч, и я подготовлю для вас прогноз!`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: new InlineKeyboard().url('🚀 Получить прогноз', 'https://t.me/aiprognozer_bot/app'),
                },
            );

            !lastErrorObject?.updatedExisting && this.notifyAboutNewUser(ctx.from);
        });
    };

    private notifyAboutNewUser = (user: WebAppUser) => {
        this.tgBot.api.sendMessage(
            this.configService.getOrThrow<string>('NEW_USERS_GROUP_ID'),
            `🚀 Новый пользователь!\n👤 Имя: ${user.first_name}\n📧 Username: @${user.username || 'без юзернейма'}\n🆔 ID: ${user.id}`,
            { parse_mode: 'Markdown', disable_notification: !this.isProduction },
        );
    };

    private handleCatch = (error: BotError<Context>) => {
        this.logger.error(`Error while handling update ${error.ctx.update.update_id}:`);

        if (error instanceof GrammyError) {
            this.logger.error(`Error in request: ${error.description}`);
        } else if (error instanceof HttpError) {
            this.logger.error(`Could not contact Telegram: ${error}`);
        } else {
            this.logger.error(`Unknown error: ${error}`, error.stack);
        }
    };

    private getLink = (ctx: CommandContext<ConversationFlavor<Context>>) => {
        readFile('./link.txt', (error, data) => {
            if (error) {
                ctx.reply('Произошла ошибка при получении актульной ссылки. Пожалуйста, попробуйте ещё раз.');
                this.logger.error(error);
                return;
            };

            ctx.reply(`Актуальная ссылка для регистрации - ${data.toString()}`);
        });
    };

    private init = () => {
        try {
            this.tgBot.catch(this.handleCatch.bind(this));

            this.tgBot.api.setMyCommands(bot_commands);
            
            this.tgBot.use(limit({ limit: 1, timeFrame: 500 }));
            this.tgBot.use(conversations());

            this.tgBot.command('link', this.getLink.bind(this));
            this.tgBot.command('start', this.onStart.bind(this));

            this.tgBot.start();
            
            this.logger.log('🚀 bot is running');
        } catch (error) {
            this.logger.error(error);
        }
    };
}