import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt/jwt.guard';
import { GetUser } from '../../auth/user/user.decorator';
import { User } from '../../auth/user/user.entity';
import { IPermissionReader } from '../interfaces';
import { Permissions } from '@libs/common';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class UserPermissionsController {
    constructor(
        @Inject(IPermissionReader) 
        private permissionReader: IPermissionReader,
    ) { }

    @Get('permissions')
    async getMyPermissions(@GetUser() user: User) {
        const permissions = await this.permissionReader.getUserPermissions(user.id);
        const permissionsWithScope = await this.permissionReader.getUserPermissionsWithScope(user.id);

        return {
            permissions,
            permissionsWithScope: permissionsWithScope.map(p => ({
                key: p.key,
                scope: p.scope,
            })),
            userContext: {
                userId: user.id,
                companyId: user.companyId || null,
                departmentId: user.departmentId || null,
                teamId: user.teamId || null,
            },
            constants: Permissions,
        };
    }

    @Get('roles')
    async getMyRoles(@GetUser() user: User) {
        const roles = await this.permissionReader.getUserRoles(user.id);
        return {
            roles: roles.map(r => ({
                id: r.id,
                name: r.name,
                description: r.description,
            })),
        };
    }
}
