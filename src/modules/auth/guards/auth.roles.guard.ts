import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRoles } from "src/modules/user/types/types";
import { Roles } from "src/shared/decorators/roles.decorator";
import { RequestWithInitDataAndUser } from "src/shared/types";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate = (context: ExecutionContext) => {
        const roles = this.reflector.getAllAndOverride<Array<UserRoles>>(Roles.name, [context.getHandler(), context.getClass()]);

        if (!roles || !roles.length) return true;
        if (!roles.includes(context.switchToHttp().getRequest<RequestWithInitDataAndUser>().user.role)) throw new ForbiddenException();

        return true;
    };
}