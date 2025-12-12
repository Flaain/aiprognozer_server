import { Injectable, Logger } from '@nestjs/common';
import { CallbackQueryContext, CommandContext, Context, InlineKeyboard, NextFunction } from 'grammy';
import { UserRepository } from '../user/user.repository';
import { USER_ROLES } from '../user/constants';
import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);
    private readonly welcomeReplyMarkup = new InlineKeyboard().text('Заменить ссылку', 'dashboard/link').row().text('Скрыть панель', 'dashboard/hide');

    constructor(private readonly userRepository: UserRepository) {}

    public async onDashboard(ctx: CommandContext<Context>) {
        ctx.reply(`*Добро пожаловать в админ-панель*`, {
            parse_mode: 'Markdown',
            reply_markup: this.welcomeReplyMarkup,
        });
    }

    public buildWelcomeScreen = async (ctx: CallbackQueryContext<ConversationFlavor<Context>>) => {
        await ctx.conversation.exit('dashboard/link');

        ctx.api.editMessageText(ctx.chatId, ctx.callbackQuery.message.message_id, `*Добро пожаловать в админ-панель*`, {
            parse_mode: 'Markdown',
            reply_markup: this.welcomeReplyMarkup,
        });

        ctx.answerCallbackQuery();
    };

    public onDashboardLink = async (ctx: CallbackQueryContext<ConversationFlavor<Context>>) => {
        await ctx.conversation.exit('dashboard/link');
        await ctx.conversation.enter('dashboard/link');

        ctx.answerCallbackQuery();
    };

    public onDashboardLinkConversation = async (
        conversation: Conversation,
        ctx: CallbackQueryContext<ConversationFlavor<Context>>,
    ) => {
        const internal_ctx: { link: string | null; isCorrect: boolean; isSuccess: boolean } = {
            link: null,
            isCorrect: false,
            isSuccess: false,
        };

        ctx.api.editMessageText(
            ctx.chatId,
            ctx.callbackQuery.message.message_id,
            '*Отправьте новую ссылку*\n\nподдерживаются следующие форматы: \n\nhttps://1qwerty.com/\nhttps://1qwerty.com/?p=aiprognoz',
            {
                parse_mode: 'Markdown',
                reply_markup: new InlineKeyboard().text('Назад', 'dashboard'),
            },
        );

        do {
            const { message } = await conversation.waitFor('message:text', { next: true });

            if (/^https?:\/\/1[^\s\/?#]+(?:\/[^\s?#]*)?(?:\?p=aiprognoz)?$/.test(message.text)) {
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

    public async onDashboardHide(ctx: CallbackQueryContext<Context>) {
        await ctx.api.deleteMessage(ctx.chatId, ctx.callbackQuery.message.message_id);

        ctx.answerCallbackQuery('Панель скрыта');
    }

    public hasAccess = async (ctx: CommandContext<Context> | CallbackQueryContext<Context>, next: NextFunction) => {
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