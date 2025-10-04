import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TgModule } from './modules/tg/tg.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { RequestMiddleware } from './shared/middlewares/request.middleware';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './shared/filters/global.exception.filter';
import { ScheduleModule } from '@nestjs/schedule';
import { ApplicationModule } from './modules/application/application.module';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        ConfigModule.forRoot({ isGlobal: true, expandVariables: true, cache: true }),
        MongooseModule.forRootAsync({
            useFactory: (configService: ConfigService) => ({ uri: configService.getOrThrow<string>('DATABASE_URI') }),
            inject: [ConfigService],
        }),
        TgModule,
        UserModule,
        AuthModule,
        ApplicationModule
    ],
    controllers: [AppController],
    providers: [{ provide: APP_FILTER, useClass: GlobalExceptionFilter }],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestMiddleware).forRoutes('*');
    }
}