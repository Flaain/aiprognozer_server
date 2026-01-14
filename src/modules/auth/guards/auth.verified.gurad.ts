import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { RequestWithInitDataAndUser } from 'src/shared/types';

@Injectable()
export class VerifiedGuard implements CanActivate {
    canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest<RequestWithInitDataAndUser>();

        if (!request.user?.isVerified) throw new ForbiddenException();

        return true;
    }
}