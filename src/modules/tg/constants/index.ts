import { BotCommand } from "grammy/types";

export const cmd: Array<BotCommand> = [
    { command: '/start', description: 'Запуск бота' },
    { command: '/link', description: 'Получить актуальную ссылку для регистрации' },
    { command: '/help', description: 'Помощь' },
];