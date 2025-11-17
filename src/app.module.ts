import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TgModule } from './modules/tg/tg.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { RequestMiddleware } from './shared/middlewares/request.middleware';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { GlobalExceptionFilter } from './shared/filters/global.exception.filter';
import { ScheduleModule } from '@nestjs/schedule';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PaymentModule } from './modules/payment/payment.module';
import { ProductModule } from './modules/product/product.module';
import { StoreModule } from './modules/store/store.module';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        ConfigModule.forRoot({ isGlobal: true, expandVariables: true, cache: true }),
        ThrottlerModule.forRoot([{ limit: 10, ttl: 60000 }]),
        MongooseModule.forRootAsync({
            useFactory: (configService: ConfigService) => ({ uri: configService.getOrThrow<string>('DATABASE_URI') }),
            inject: [ConfigService],
        }),
        TgModule.forRootAsync({
            useFactory: (conifgSerivce: ConfigService) => ({ token: conifgSerivce.getOrThrow<string>('BOT_TOKEN') }),
            inject: [ConfigService],
        }),
        UserModule,
        AuthModule,
        DashboardModule,
        AnalysisModule,
        PaymentModule,
        ProductModule,
        StoreModule
    ],
    controllers: [AppController],
    providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestMiddleware).forRoutes('*');
    }
}