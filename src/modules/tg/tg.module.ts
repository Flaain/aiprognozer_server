import { DynamicModule, Module, Provider } from '@nestjs/common';
import { TgService } from './tg.service';
import { Bot, Context } from 'grammy';
import { TgBot, TgModuleAsyncOptions } from './types';
import { PROVIDERS } from 'src/shared/constants';
import { UserModule } from '../user/user.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ConversationFlavor } from '@grammyjs/conversations';

@Module({})
export class TgModule {
    public static async forRootAsync(options: TgModuleAsyncOptions): Promise<DynamicModule> {
        const provider: Provider<TgBot> = {
            provide: PROVIDERS.TG_BOT,
            useFactory: async (...deps) => {
                const { token, config } = await options.useFactory(...deps);

                if (!token) throw new Error('Missing bot token');

                return new Bot<ConversationFlavor<Context>>(token, config);
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