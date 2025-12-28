import { Injectable } from '@nestjs/common';
import { createAbilityBuilder, AppAbility } from './casl-types';
import { PermissionsService } from '../services/permissions.service';
import { User } from '../../auth/user/user.entity';
import { IAbilityFactory } from '../interfaces';

@Injectable()
export class CaslAbilityFactory implements IAbilityFactory {
    constructor(private permissionsService: PermissionsService) { }

    async createForUser(user: User): Promise<AppAbility> {
        const { can, build } = createAbilityBuilder();

        // Super admin shortcut: full access
        const roles = await this.permissionsService.getUserRoles(user.id);
        const hasSuperAdmin = roles.some(r => r.name.replace(/\s+/g, '').toLowerCase() === 'superadmin');
        if (hasSuperAdmin) {
            can('manage' as any, 'all' as any);
            return build();
        }

        const permissions = await this.permissionsService.getUserPermissions(user.id);

        for (const perm of permissions) {
            const [resource, action] = perm.split(':');
            can(action as any, resource as any);
        }

        return build();
    }
}
