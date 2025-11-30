import { DynamicModule, Module, Provider } from '@nestjs/common';
import { TgService } from './tg.service';
import { Bot } from 'grammy';
import { TgModuleAsyncOptions } from './types';
import { PROVIDERS } from 'src/shared/constants';
import { UserModule } from '../user/user.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { UserFromGetMe } from 'grammy/types';

@Module({})
export class TgModule {
    public static async forRootAsync(options: TgModuleAsyncOptions): Promise<DynamicModule> {
        const provider: Provider = {
            provide: PROVIDERS.TG_PROVIDER,
            useFactory: async (...deps) => {
                const { token, config } = await options.useFactory(...deps);

                if (!token) throw new Error('Missing bot token');

                return {
                    bot: new Bot(token, config),
                    subscribers: new Set<(botInfo: UserFromGetMe) => void>(),
                    subscribe: function (subscriber: (botInfo: UserFromGetMe) => void) {
                        this.subscribers.add(subscriber);

                        return () => {
                            this.subscribers.delete(subscriber);
                        };
                    },
                    notify: function (botInfo: UserFromGetMe) {
                        this.subscribers.forEach((subscriber) => subscriber(botInfo));
                    },
                }
            },
            inject: options.inject ?? [],
        };

        return {
            global: true,
            module: TgModule,
            imports: [UserModule, DashboardModule],
            providers: [provider, TgService],
            exports: [provider],
        };
    }
}