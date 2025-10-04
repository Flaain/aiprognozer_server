import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, CommandContext, Context } from 'grammy';
import { bot_commands } from './constants';
import { WebAppUser } from '../user/types/types';

@Injectable()
export class TgService {
    private readonly tgBot: Bot;
    private readonly logger = new Logger(TgService.name);
    private readonly isProduction: boolean;

    constructor(private readonly configService: ConfigService) {
        this.tgBot = new Bot(this.configService.getOrThrow<string>('BOT_TOKEN'));
        this.isProduction = configService.getOrThrow<string>('NODE_ENV') === 'production';

        this.logger.log('🚀 tg bot is running');

        this.init();
    }

    private onStart = (ctx: CommandContext<Context>) => {
        ctx.reply(
            `*Добро пожаловать*, ${ctx.from.first_name}\n\nЯ — ваш персональный ИИ-аналитик для ставок. Моя задача — помогать вам ориентироваться в мире спортивных событий:\n\n1. Анализирую статистику и актуальные данные.\n2. Оцениваю риски и вероятность исходов.\n3. Формирую краткие прогнозы, которые могут быть полезны при выборе ставки.\n\nПопробуйте прямо сейчас — выберите матч, и я подготовлю для вас прогноз!`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[{ text: '🚀 Получить прогноз', url: 't.me/aiprognozer_bot/app' }]],
                },
            },
        );
    };

    public notifyAboutNewUser = (user: WebAppUser) => {
        this.tgBot.api.sendMessage(
            this.configService.getOrThrow<string>('NEW_USERS_GROUP_ID'),
            `🚀 Новый пользователь!\n👤 Имя: ${user.first_name}\n📧 Username: @${user.username || 'без юзернейма'}\n🆔 ID: ${user.id}`,
            { parse_mode: 'Markdown', disable_notification: !this.isProduction },
        );
    };

    public notifyOnApplicationSend = (user: WebAppUser, one_win_name: string) => {
        this.tgBot.api.sendMessage(
            user.id,
            `${user.first_name}, спасибо за проявленный интерес к нашему боту. Ваша заявка получена и находится в обработке.`,
        );

        this.tgBot.api.sendMessage(
            this.configService.getOrThrow<string>('NEW_USERS_GROUP_ID'),
            `🚀 *НОВАЯ ЗАЯВКА*!\n🎯 Имя реферала: \`${one_win_name}\``,
            { parse_mode: 'Markdown', disable_notification: !this.isProduction },
        );
    }

    public notifyOnApplicationReject = (telegram_id: number, one_win_name: string) => {
        this.tgBot.api.sendMessage(
            telegram_id, 
            `К сожалению, ваша заявка, поданная с указанным именем - *${one_win_name}*, была отклонена.\nВы можете подать новую заявку. `,
            { parse_mode: 'Markdown' }
        )
    };

    private init = () => {
        try {
            this.tgBot.start();
            this.tgBot.command('start', this.onStart.bind(this));
            this.tgBot.api.setMyCommands(bot_commands);
        } catch (error) {
            this.logger.error(error);
        }
    };
}