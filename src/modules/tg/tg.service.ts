import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandContext, Context, BotError, InlineKeyboard, GrammyError, HttpError } from 'grammy';
import { cmd } from './constants';
import { PROVIDERS } from 'src/shared/constants';
import { readFile } from 'node:fs/promises';
import { Conversation, ConversationFlavor, conversations, createConversation } from '@grammyjs/conversations';
import { TgProvider } from './types';
import { join } from 'node:path';
import { UserService } from '../user/user.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { escapeMD } from 'src/shared/utils/escapeMD';

@Injectable()
export class TgService {
    private readonly logger = new Logger(TgService.name);
    private readonly isProduction: boolean;

    constructor(
        @Inject(PROVIDERS.TG_PROVIDER) private readonly tgProvider: TgProvider,
        private readonly configService: ConfigService,
        private readonly userService: UserService,
        private readonly dashboardService: DashboardService
    ) {
        this.isProduction = configService.getOrThrow<string>('NODE_ENV') === 'production';

        this.init();
    }

    private onStart = async (ctx: CommandContext<Context>) => {
        try {
            if (!ctx.from) return;
    
            const link = await readFile(join(__dirname, '..', '..', 'link.txt'), 'utf-8');
            
            await this.userService.findOrCreateUserByTelegramId(ctx.from, 'bot');
    
            ctx.reply(
                `*Добро пожаловать, ${escapeMD(ctx.from.first_name)}!*\n\nЯ — ваш персональный ИИ-аналитик для ставок на спорт. Моя задача — помогать вам ориентироваться в мире спортивных событий. Вот что я делаю:\n\n1. Анализирую статистику и актуальные данные.\n2. Оцениваю риски, рассчитываю вероятности исходов.\n3. Формирую краткие прогнозы, которые могут быть полезны при выборе ставки.\n\nЧтобы разблокировать доступ к моим прогнозам, зарегистрируйтесь по реферальной ссылке ниже, это обязательно и займет всего минуту! \n\n${link.toString()}\n\nГотовы? Выберите матч, и я подготовлю для вас прогноз!`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: new InlineKeyboard().url('🚀 Получить прогноз', `https://t.me/${this.configService.getOrThrow<string>('BOT_USERNAME')}/app`),
                },
            );
        } catch (error) {
            this.logger.error(error);
        }
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
        const link = await readFile(join(__dirname, '..', '..', 'link.txt'), 'utf-8');

        ctx.reply(`Актуальная ссылка для регистрации - ${link.toString()}`);
    };

    private handleRefund = async (conversation: Conversation, ctx: CommandContext<ConversationFlavor<Context>>) => {
        if (this.isProduction) return;

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

    private handleCtx = (ctx: CommandContext<Context>) => {
        ctx.reply(
            `<pre><code class="language-json">${JSON.stringify(ctx.chat, null, 2)}</code></pre>`,
            {
                parse_mode: 'HTML',
            },
        );
    }

    private onHelpCommand = (ctx: CommandContext<Context>) => {
        ctx.reply('Если у вас возникли вопросы, замечания или требуется техническая поддержка — обращайтесь по любым вопросам к @aiprognozer_support');
    };

    private init = async () => {
        try {
            this.tgProvider.bot.catch(this.handleCatch.bind(this));

            await this.tgProvider.bot.api.setMyCommands(cmd);
            
            // this.tgProvider.bot.use(limit({ limit: 1, timeFrame: 500 }));
            
            this.tgProvider.bot.use(conversations());
            this.tgProvider.bot.use(createConversation(this.handleRefund, 'refund-conversation'));
            this.tgProvider.bot.use(
                createConversation(this.dashboardService.onDashboardLinkConversation.bind(this.dashboardService), {
                    id: 'dashboard/link',
                    maxMillisecondsToWait: 60 * 1000 * 5,
                }),
            );

            this.tgProvider.bot.command('link', this.getLink.bind(this));
            this.tgProvider.bot.command('start', this.onStart.bind(this));
            this.tgProvider.bot.command('help', this.onHelpCommand.bind(this));

            if (!this.isProduction) {
                this.tgProvider.bot.command('refund', this.handleRefund.bind(this));
                this.tgProvider.bot.command('context', this.handleCtx.bind(this));
            }

            this.tgProvider.bot.start({ onStart: (botInfo) => this.tgProvider.notify(botInfo) });
            
            this.logger.log('🚀 bot is running');
        } catch (error) {
            this.logger.error(error);
        }
    };
}