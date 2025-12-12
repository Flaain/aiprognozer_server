import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { CORS, PROVIDERS } from './shared/constants';
import { TgProvider } from './modules/tg/types';

(async () => {
    try {
        const PORT = process.env.PORT ?? 3000;

        const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: CORS });

        app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false }));
        
        app.enableShutdownHooks();
        
        app.setGlobalPrefix('api');

        const gracefulShutdown = async (signal: Extract<NodeJS.Signals, 'SIGTERM' | 'SIGINT'>) => {
            try {
                console.log(`🛑 Received ${signal}, starting graceful shutdown...`);

                await app.get<TgProvider>(PROVIDERS.TG_PROVIDER).bot.stop();
                await app.close();
                
                console.log('✅ Application closed gracefully');

                process.exit(0);
            } catch (error) {
                console.error('❌ Error during graceful shutdown', error);

                process.exit(1);
            }
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        process.on('uncaughtException', (err) => {
            console.error('💥 Uncaught Exception', err);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });

        await app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
    } catch (error) {
        console.log(error);
    }
})();