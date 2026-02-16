import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { CORS, PROVIDERS } from './shared/constants';
import { Bot } from 'grammy';
import { Logger } from '@nestjs/common';

(async () => {
    const logger = new Logger('Bootstrap');

    try {
        const PORT = process.env.PORT ?? 3000;
        const PREFIX = process.env.GLOBAL_PREFIX ?? null;

        const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: CORS });
        

        app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false }));

        app.enableShutdownHooks();

        PREFIX && app.setGlobalPrefix(PREFIX);

        const gracefulShutdown = async (signal: Extract<NodeJS.Signals, 'SIGTERM' | 'SIGINT'>) => {
            try {
                logger.log(`🛑 Received ${signal}, starting graceful shutdown...`);

                await app.get<Bot>(PROVIDERS.TG_BOT).stop();
                await app.close();

                logger.log('✅ Application closed gracefully');

                process.exit(0);
            } catch (error) {
                logger.error('❌ Error during graceful shutdown', error);

                process.exit(1);
            }
        };

        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

        process.on('uncaughtException', (err) => {
            logger.error('💥 Uncaught Exception', err);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });

        await app.listen(PORT);

        logger.debug(`Server successfully started at ${PORT} port`);
        logger.debug(`You can access server at - http://localhost:${PORT}${PREFIX ? `/${PREFIX}` : ''}`);
    } catch (error) {
        logger.log(error);
    }
})();