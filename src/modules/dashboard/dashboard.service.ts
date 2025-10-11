import { Injectable, Logger } from '@nestjs/common';
import { CallbackQueryContext, CommandContext, Context, InlineKeyboard, NextFunction } from 'grammy';
import { UserRepository } from '../user/user.repository';
import { USER_ROLES } from '../user/constants';
import { ApplicationService } from '../application/application.service';

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);

    constructor(
        private readonly userRepository: UserRepository,
        private readonly apllicationService: ApplicationService,
    ) {}

    public async onDashboard(ctx: CommandContext<Context>) {
        ctx.reply(`*Добро пожаловать в админ-панель*`, {
            parse_mode: 'Markdown',
            reply_markup: new InlineKeyboard().text('Заявки', 'dashboard/applications').row().text('Скрыть панель', 'dashboard/hide'),
        });
    };

    public buildWelcomeScreen = (ctx: CallbackQueryContext<Context>) => {
        ctx.api.editMessageText(
            ctx.callbackQuery.message.chat.id, 
            ctx.callbackQuery.message.message_id, 
            `*Добро пожаловать в админ-панель*`,
            {
                parse_mode: 'Markdown',
                reply_markup: new InlineKeyboard().text('Заявки', 'dashboard/applications').row().text('Скрыть панель', 'dashboard/hide'),
            }
        );

        ctx.answerCallbackQuery();
    }

    public async onDashboardHide(ctx: CallbackQueryContext<Context>) {
        ctx.api.deleteMessage(ctx.callbackQuery.message.chat.id, ctx.callbackQuery.message.message_id);
        ctx.answerCallbackQuery('Панель скрыта');
    };

    public hasAccess = async (ctx: CommandContext<Context> | CallbackQueryContext<Context>, next: NextFunction) => {
        if (!await this.userRepository.exists({ telegram_id: ctx.from.id, isVerified: true, role: USER_ROLES.ADMIN })) return; // silently ignore

        await next();
    }

    public async onDashboardApplications(ctx: CallbackQueryContext<Context>) {
        const keyboard = await this.buildPaginatedMenu(Number(ctx.callbackQuery.data.split('/')[1].split('=')[1] ?? 1));
        
        ctx.api.editMessageText(
            ctx.callbackQuery.message.chat.id, ctx.callbackQuery.message.message_id, 
            `${keyboard ? '*Заявки*' : 'Пока нет ни одной заявки'}`, 
            { parse_mode: 'Markdown', reply_markup: keyboard ?? new InlineKeyboard().text('Вернуться назад', 'dashboard') }
        );

        ctx.answerCallbackQuery();
    };

    private buildPaginatedMenu = async (page: number): Promise<InlineKeyboard | null> => {
        if (isNaN(page) || typeof page !== 'number') return null;

        const { applications, currentPage, hasNextPage, hasPrevPage, totalPages } = await this.apllicationService.getApplications({ page });

        if (!applications.length) return null;

        const keyboard = InlineKeyboard.from([...applications.map(({ _id, onewin_id }) => [InlineKeyboard.text(`Заявка: ${onewin_id}`, `dashboard/application/${_id}?from=${page}`)])]);

        if (hasNextPage) keyboard.row().text('Следующая страница', `dashboard/applications?page=${currentPage + 1}`);
        if (hasPrevPage) keyboard.row().text('Предыдущая страница', `dashboard/applications?page=${currentPage - 1}`);

        keyboard.row().text('Вернуться назад', 'dashboard');
        keyboard.row().text(`Страница ${currentPage} из ${totalPages}`);
        
        return keyboard;
    }
}