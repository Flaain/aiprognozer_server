import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { UserRoles } from 'src/modules/user/types/types';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { VerifiedGuard } from '../guards/auth.verified.gurad';

export const AUTH_KEY = 'isAuth';

export const Auth = (onlyVerified: boolean, ...roles: Array<UserRoles>) => {
    const decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator> = [];

    decorators.push(SetMetadata(AUTH_KEY, true));

    onlyVerified && decorators.push(UseGuards(VerifiedGuard));
    roles.length && decorators.push(Roles(...roles));

    return applyDecorators(...decorators);
};