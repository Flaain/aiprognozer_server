import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { APP_GUARD } from '@nestjs/core';
import { InitGuard } from './guards/auth.init.guard';
import { UserModule } from '../user/user.module';
import { TgModule } from '../tg/tg.module';

@Module({
    imports: [UserModule, TgModule],
    controllers: [AuthController],
    providers: [AuthService, { useClass: InitGuard, provide: APP_GUARD }],
})
export class AuthModule {}