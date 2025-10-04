import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { RolesGuard } from 'src/modules/auth/guards/auth.roles.guard';
import { UserRoles } from 'src/modules/user/types/types';

export const Roles = (...roles: Array<UserRoles>) => applyDecorators(SetMetadata(Roles.name, roles), UseGuards(RolesGuard));