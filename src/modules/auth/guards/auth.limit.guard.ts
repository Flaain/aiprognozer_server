import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { RequestWithInitDataAndUser } from 'src/shared/types';
import { AppException } from 'src/shared/exceptions/app.exception';

@Injectable()
export class LimitGuard implements CanActivate {
    async canActivate(context: ExecutionContext) {
        const { user } = context.switchToHttp().getRequest<RequestWithInitDataAndUser>();

        if (user.isUnlimited) return true;

        if (user.request_limit <= user.request_count) {
            throw new AppException(
                { errorCode: 'REQUEST_LIMIT_EXCEEDED', message: 'Request limit exceeded' },
                HttpStatus.BAD_REQUEST,
            );
        }

        return true;
    }
}