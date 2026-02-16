import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { CallbackQueryContext, CommandContext, Context, InlineKeyboard, NextFunction } from 'grammy';
import { UserRepository } from '../user/user.repository';
import { USER_ROLES } from '../user/constants';
import { Conversation, ConversationFlavor, createConversation } from '@grammyjs/conversations';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { URL } from 'node:url';
import { ms } from 'src/shared/utils/ms';
import { PROVIDERS } from 'src/shared/constants';
import { TgBot } from '../tg/types';

@Injectable()
export class DashboardService implements OnApplicationBootstrap {
    private readonly logger = new Logger(DashboardService.name);
    private readonly dashboardMarkup = new InlineKeyboard()
        .text('Заменить ссылку', 'dashboard/link')
        .row()
        .text('Скрыть панель', 'dashboard/hide');

    constructor(
        private readonly userRepository: UserRepository,
        @Inject(PROVIDERS.TG_BOT) private readonly tgBot: TgBot,
    ) {}

    public onApplicationBootstrap = () => {
        this.tgBot.command('dashboard', this.hasAccess, this.onDashboard);

        this.tgBot.callbackQuery('dashboard', this.hasAccess, this.buildWelcomeScreen);
        this.tgBot.callbackQuery('dashboard/hide', this.hasAccess, this.onDashboardHide);
        this.tgBot.callbackQuery('dashboard/link', this.hasAccess, this.onDashboardLink);
    };

    public registerDashboardLinkConversation = () => createConversation(this.onDashboardLinkConversation, { id: 'dashboard/link', maxMillisecondsToWait: ms('5m') });

    private onDashboard = async (ctx: CommandContext<ConversationFlavor<Context>>) => {
        ctx.reply(`*Добро пожаловать в админ-панель*`, {
            parse_mode: 'Markdown',
            reply_markup: this.dashboardMarkup,
        });
    };

    private buildWelcomeScreen = async (ctx: CallbackQueryContext<ConversationFlavor<Context>>) => {
        ctx.api.editMessageText(ctx.chatId, ctx.callbackQuery.message.message_id, `*Добро пожаловать в админ-панель*`, {
            parse_mode: 'Markdown',
            reply_markup: this.dashboardMarkup,
        });

        ctx.answerCallbackQuery();
    };

    private onDashboardLink = async (ctx: CallbackQueryContext<ConversationFlavor<Context>>) => {
        await ctx.conversation.enter('dashboard/link');

        ctx.answerCallbackQuery();
    };

    private onDashboardLinkConversation = async (
        conversation: Conversation,
        ctx: CallbackQueryContext<ConversationFlavor<Context>>,
    ) => {
        const internal_ctx: { link: string | null; isCorrect: boolean; isSuccess: boolean } = {
            link: null,
            isCorrect: false,
            isSuccess: false,
        };

        await ctx.api.editMessageText(ctx.chatId, ctx.callbackQuery.message.message_id, '*Отправьте новую ссылку*', {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[{ text: 'Отменить', callback_data: 'dashboard' }]],
            },
        });

        do {
            const { message } = await conversation.waitUntil(
                (ctx) => ctx.has('message:text') && !ctx.has('::bot_command') && !ctx.has('callback_query'),
                { maxMilliseconds: ms('5m'), otherwise: () => conversation.halt({ next: true }) },
            );

            if (this.validateLink(message.text)) {
                internal_ctx.link = message.text;
                internal_ctx.isCorrect = true;
            } else {
                ctx.reply('❌️ Некорректная ссылка, попробуйте еще раз ❌️');
            }
        } while (!internal_ctx.isCorrect);

        for (let i = 0; i < 3; i += 1) {
            try {
                await writeFile(join(__dirname, '..', '..', 'link.txt'), internal_ctx.link);

                internal_ctx.isSuccess = true;

                break;
            } catch (error) {
                this.logger.error(`Error writing link to file: ${error}`);
            }
        }

        ctx.reply(internal_ctx.isSuccess ? '✅️ Ссылка успешно обновлена ✅️' : '❌️ Произошла ошибка при обновлении ссылки ❌️');

        return;
    };

    private validateLink = (link: string) => {
        try {
            if (!link) return false;

            const trimmted = link.trim();

            if (!trimmted.length) return false;

            const url = new URL(trimmted);

            if (!/^https?:/.test(url.protocol) || !url.hostname.startsWith('1')) return false;

            const allowedQueryParams = ['p', 'open'];

            for (const [key] of Array.from(url.searchParams.entries())) {
                if (!allowedQueryParams.includes(key)) return false;
            }

            return true;
        } catch (error) {
            this.logger.error(`Error validating link: ${error}`);

            return false;
        }
    };

    private async onDashboardHide(ctx: CallbackQueryContext<ConversationFlavor<Context>>) {
        await ctx.api.deleteMessage(ctx.chatId, ctx.callbackQuery.message.message_id);

        ctx.answerCallbackQuery('Панель скрыта');
    }

    private hasAccess = async (
        ctx: CommandContext<ConversationFlavor<Context>> | CallbackQueryContext<ConversationFlavor<Context>>,
        next: NextFunction,
    ) => {
        if (
            ctx.chat.type !== 'private' ||
            !(await this.userRepository.userExists({
                telegram_id: ctx.from.id,
                isVerified: true,
                role: USER_ROLES.ADMIN,
            }))
        )
            return;

        await next();
    };
}
