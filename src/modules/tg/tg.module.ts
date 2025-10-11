import { DynamicModule, Module, Provider } from '@nestjs/common';
import { TgService } from './tg.service';
import { Bot } from 'grammy';
import { TgModuleAsyncOptions } from './types';
import { PROVIDERS } from 'src/shared/constants';
import { UserModule } from '../user/user.module';

@Module({})
export class TgModule {
    public static async forRootAsync(options: TgModuleAsyncOptions): Promise<DynamicModule> {
        const provider: Provider = {
            provide: PROVIDERS.TG_BOT,
            useFactory: async (...deps) => {
                const { token, config } = await options.useFactory(...deps);

                if (!token) throw new Error('Missing bot token');

                return new Bot(token, config);
            },
            inject: options.inject ?? [],
        };

        return {
            global: true,
            module: TgModule,
            imports: [UserModule],
            providers: [provider, TgService],
            exports: [provider],
        };
    }
}