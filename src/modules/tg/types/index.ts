import { ModuleMetadata } from '@nestjs/common';
import { Bot, BotConfig, Context } from 'grammy';
import { UserFromGetMe } from 'grammy/types';

export interface TgModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useFactory: (...args: Array<any>) => Promise<TgModuleOptions> | TgModuleOptions;
    inject?: Array<any>;
}

export interface TgModuleOptions {
    token: string;
    config?: BotConfig<Context>;
}

export interface TgProvider {
    bot: Bot;
    subscribers: Set<(botInfo: UserFromGetMe) => void>;
    subscribe: (subscriber: (botInfo: UserFromGetMe) => void) => () => void;
    notify: (botInfo: UserFromGetMe) => void;
}