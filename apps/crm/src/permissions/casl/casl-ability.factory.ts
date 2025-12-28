import { Injectable } from '@nestjs/common';
import { createAbilityBuilder, AppAbility } from './casl-types';
import { PermissionsService } from '../services/permissions.service';
import { User } from '../../auth/user/user.entity';
import { PermissionScope } from '@libs/common';
import { IAbilityFactory } from '../interfaces';

@Injectable()
export class CaslAbilityFactory implements IAbilityFactory {
    constructor(private permissionsService: PermissionsService) { }

    async createForUser(user: User): Promise<AppAbility> {
        const { can, build } = createAbilityBuilder();

        const permissions = await this.permissionsService.getUserPermissionsWithScope(user.id);

        for (const perm of permissions) {
            const [resource, action] = perm.key.split(':');
            const conditions = this.buildScopeConditions(user, perm.scope);

            if (Object.keys(conditions).length > 0) {
                can(action as any, resource as any, conditions);
            } else {
                can(action as any, resource as any);
            }
        }

        return build();
    }

    private buildScopeConditions(user: User, scope: PermissionScope): Record<string, any> {
        switch (scope) {
            case PermissionScope.GLOBAL:
                return {};
            case PermissionScope.COMPANY:
                return user.companyId ? { companyId: user.companyId } : {};
            case PermissionScope.DEPARTMENT:
                return user.companyId && user.departmentId
                    ? { companyId: user.companyId, departmentId: user.departmentId }
                    : {};
            case PermissionScope.TEAM:
                return user.teamId ? { teamId: user.teamId } : {};
            case PermissionScope.SELF:
                return { userId: user.id };
            default:
                return { userId: user.id };
        }
    }
}
