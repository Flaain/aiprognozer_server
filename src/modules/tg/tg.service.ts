import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandContext, Context, BotError, InlineKeyboard, GrammyError, HttpError } from 'grammy';
import { cmd } from './constants';
import { PROVIDERS } from 'src/shared/constants';
import { readFile } from 'node:fs/promises';
import { Conversation, ConversationFlavor, conversations, createConversation } from '@grammyjs/conversations';
import { UserService } from '../user/user.service';
import { escapeMD } from 'src/shared/utils/escapeMD';
import { limit } from '@grammyjs/ratelimiter';
import { TgBot } from './types';
import { DashboardService } from '../dashboard/dashboard.service';

@Injectable()
export class TgService implements OnModuleInit {
    private readonly logger = new Logger(TgService.name);
    private readonly isProduction: boolean;

    constructor(
        @Inject(PROVIDERS.TG_BOT) private readonly tgBot: TgBot,
        private readonly configService: ConfigService,
        private readonly userService: UserService,
        private readonly dashboardService: DashboardService,
    ) {
        this.isProduction = configService.getOrThrow<string>('NODE_ENV') === 'production';
    }

    public onModuleInit = async () => {
        try {
            this.tgBot.catch(this.handleCatch);

            await this.tgBot.api.setMyCommands(cmd);
            
            this.tgBot.use(limit({ limit: 1, timeFrame: 50 }));
            
            this.tgBot.use(conversations());

            !this.isProduction && this.tgBot.use(createConversation(this.handleRefund, 'refund-conversation'));
            
            this.tgBot.use(this.dashboardService.registerDashboardLinkConversation());

            this.tgBot.command('link', this.getLink);
            this.tgBot.command('start', this.onStart);
            this.tgBot.command('help', this.onHelpCommand);

            if (!this.isProduction) {
                this.tgBot.command('refund', async (ctx) => { await ctx.conversation.enter('refund-conversation'); });
                this.tgBot.command('context', this.handleCtx);
            }

            this.tgBot.start({
                onStart: (me) => {
                    this.logger.log(`🚀 bot successfully started. Here is a bot info:\n${JSON.stringify(me, null, 4)}`);
                },
            });
        } catch (error) {
            this.logger.error(error);
        }
    };

    private onStart = async (ctx: CommandContext<ConversationFlavor<Context>>) => {
        try {
            if (!ctx.from) return;

            const link = await readFile('link.txt', 'utf-8');
            
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
        const link = await readFile('link.txt', 'utf-8');

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

    private handleCtx = (ctx: CommandContext<ConversationFlavor<Context>>) => {
        ctx.reply(
            `<pre><code class="language-json">${JSON.stringify(ctx.chat, null, 2)}</code></pre>`,
            {
                parse_mode: 'HTML',
            },
        );
    }

    private onHelpCommand = (ctx: CommandContext<ConversationFlavor<Context>>) => {
        ctx.reply('Если у вас возникли вопросы, замечания или требуется техническая поддержка — обращайтесь по любым вопросам к @aiprognozer_support');
    };
}