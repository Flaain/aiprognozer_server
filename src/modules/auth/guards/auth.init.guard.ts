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
        const targets = [context.getHandler(), context.getClass()]

        if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) return true;

        const request = context.switchToHttp().getRequest();

        const { 0: type, 1: data } = (request.headers['authorization'] || '').split(' ');

        if (!type || !data || type !== 'tma') throw new UnauthorizedException();

        request.init_data = this.authService.parseInitData(data);

        this.reflector.getAllAndOverride<boolean>(AUTH_KEY, targets) && (request.user = await this.authService.validate(request.init_data.user.id));

        return true;
    }
}