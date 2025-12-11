import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { RequestWithInitDataAndUser } from 'src/shared/types';
import { AppException } from 'src/shared/exceptions/app.exception';
import { ms } from 'src/shared/utils/ms';

@Injectable()
export class LimitGuard implements CanActivate {
    async canActivate(context: ExecutionContext) {
        const { user } = context.switchToHttp().getRequest<RequestWithInitDataAndUser>();

        if (user.isUnlimited) return true;

        if (user.first_request_at && +new Date(user.first_request_at) + ms('24h') > Date.now()) {
            if (user.request_count >= user.request_limit) {
                throw new AppException(
                    {
                        message: 'Limit exceeded',
                        errorCode: 'REQUEST_LIMIT_EXCEEDED',
                        first_request_at: user.first_request_at,
                    },
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            } else {
                user.request_count += 1;
            }
        } else {
            user.request_count = 1;
            user.first_request_at = new Date();
        }

        return true;
    }
}