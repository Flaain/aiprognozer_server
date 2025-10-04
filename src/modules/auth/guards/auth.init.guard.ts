import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PUBLIC_KEY } from 'src/shared/decorators/public.decorator';
import { AuthService } from '../auth.service';
import { AUTH_KEY } from '../decorators/auth.decorator';

@Injectable()
export class InitGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly authService: AuthService,
    ) {}

    async canActivate(context: ExecutionContext) {
        const handler = context.getHandler();

        if (this.reflector.get<boolean>(PUBLIC_KEY, handler)) return true;

        const request = context.switchToHttp().getRequest();

        const { 0: type, 1: data } = (request.headers['authorization'] || '').split(' ');
        
        if (!type || !data || type !== 'tma') throw new UnauthorizedException();

        const parsedInitData = this.authService.parseInitData(data);

        request.init_data = parsedInitData;

        this.reflector.get<boolean>(AUTH_KEY, handler) && (request.user = await this.authService.validate(request.init_data.user.id));

        return true;
    }
}