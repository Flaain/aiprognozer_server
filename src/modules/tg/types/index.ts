import { ConversationFlavor } from '@grammyjs/conversations';
import { ModuleMetadata } from '@nestjs/common';
import { Bot, BotConfig, Context } from 'grammy';

export type TgBot = Bot<ConversationFlavor<Context>>;

export interface TgModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useFactory: (...args: Array<any>) => Promise<TgModuleOptions> | TgModuleOptions;
    inject?: Array<any>;
}

export interface TgModuleOptions {
    token: string;
    config?: BotConfig<ConversationFlavor<Context>>;
}