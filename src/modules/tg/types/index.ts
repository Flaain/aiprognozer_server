import { ModuleMetadata } from '@nestjs/common';
import { BotConfig, Context } from 'grammy';

export interface TgModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useFactory: (...args: Array<any>) => Promise<TgModuleOptions> | TgModuleOptions;
    inject?: Array<any>;
}

export interface TgModuleOptions {
    token: string;
    config?: BotConfig<Context>;
}
