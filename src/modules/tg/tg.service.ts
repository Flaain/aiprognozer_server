import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandContext, Context, BotError, InlineKeyboard, GrammyError, HttpError } from 'grammy';
import { bot_commands } from './constants';
import { WebAppUser } from '../user/types/types';
import { UserRepository } from '../user/user.repository';
import { PROVIDERS } from 'src/shared/constants';
import { readFile } from 'node:fs/promises';
import { Conversation, ConversationFlavor, conversations, createConversation } from '@grammyjs/conversations';
import { TgProvider } from './types';
import { join } from 'node:path';

@Injectable()
export class TgService {
    private readonly logger = new Logger(TgService.name);
    private readonly isProduction: boolean;

    constructor(
        @Inject(PROVIDERS.TG_PROVIDER) private readonly tgProvider: TgProvider,
        private readonly configService: ConfigService,
        private readonly userRepository: UserRepository,
    ) {
        this.isProduction = configService.getOrThrow<string>('NODE_ENV') === 'production';

        this.init();
    }

    private onStart = async (ctx: CommandContext<Context>) => {
        if (!ctx.from) return;

        const link = await readFile(join(__dirname, '..', '..', 'link.txt'), 'utf-8');
        const { lastErrorObject } = await this.userRepository.findOrCreateUserByTelegramId(ctx.from.id);

        ctx.reply(
            `*Добро пожаловать, ${ctx.from.first_name}!*\n\nЯ — ваш персональный ИИ-аналитик для ставок на спорт. Моя задача — помогать вам ориентироваться в мире спортивных событий. Вот что я делаю:\n\n1. Анализирую статистику и актуальные данные.\n2. Оцениваю риски, рассчитываю вероятности исходов.\n3. Формирую краткие прогнозы, которые могут быть полезны при выборе ставки.\n\nЧтобы разблокировать доступ к моим прогнозам, зарегистрируйтесь по реферальной ссылке ниже, это обязательно и займет всего минуту! \n\n${link.toString()}\n\nГотовы? Выберите матч, и я подготовлю для вас прогноз!`,
            {
                parse_mode: 'Markdown',
                reply_markup: new InlineKeyboard().url('🚀 Получить прогноз', 'https://t.me/aiprognozer_bot/app'),
            },
        );

        !lastErrorObject?.updatedExisting && this.notifyAboutNewUser(ctx.from);
    };

    private notifyAboutNewUser = (user: WebAppUser) => {
        this.tgProvider.bot.api.sendMessage(
            this.configService.getOrThrow<string>('NEW_USERS_GROUP_ID'),
            `🚀 Новый пользователь!\n\n👤 Имя: ${user.first_name}\n📧 Username: @${user.username || 'без юзернейма'}\n🆔 ID: ${user.id}`,
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

    private getLink = async (ctx: CommandContext<ConversationFlavor<Context>>) => {
        const link = await readFile('./link.txt', 'utf-8');

        ctx.reply(`Актуальная ссылка для регистрации - ${link.toString()}`);
    };

    private handleRefund = async (conversation: Conversation, ctx: CommandContext<ConversationFlavor<Context>>) => {
        if (!(this.configService.getOrThrow<string>('NODE_ENV') === 'development')) return;

        try {
            ctx.reply('Отправьте telegram_payment_charge_id');

            const { message } = await conversation.waitFor('message:text', { next: true });

            await ctx.api.refundStarPayment(ctx.chat.id, message.text);

            ctx.reply('Платеж возвращен');

            return;
        } catch (error) {
            ctx.reply('Произошла ошибка');
        }
    }

    private onHelpCommand = (ctx: CommandContext<Context>) => {
        ctx.reply('Если у вас возникли вопросы, замечания или требуется техническая поддержка — обращайтесь по любым вопросам к @support');
    };

    private init = async () => {
        try {
            this.tgProvider.bot.catch(this.handleCatch.bind(this));

            await this.tgProvider.bot.api.setMyCommands(bot_commands);
            
            // this.tgProvider.bot.use(limit({ limit: 1, timeFrame: 500 }));
            
            this.tgProvider.bot.use(conversations());
            this.tgProvider.bot.use(createConversation(this.handleRefund, 'refund-conversation'));
            
            this.tgProvider.bot.command('link', this.getLink.bind(this));
            this.tgProvider.bot.command('start', this.onStart.bind(this));
            this.tgProvider.bot.command('help', this.onHelpCommand.bind(this));

            if (this.configService.getOrThrow<string>('NODE_ENV') === 'development') {
                this.tgProvider.bot.command('refund', this.handleRefund.bind(this));
            }

            this.tgProvider.bot.start({ onStart: (botInfo) => this.tgProvider.notify(botInfo) });
            
            this.logger.log('🚀 bot is running');
        } catch (error) {
            this.logger.error(error);
        }
    };
}