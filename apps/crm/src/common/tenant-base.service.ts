import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../auth/user/user.entity';
import { UserOrganizationRole } from '../auth/organization/user-organization-role.entity';

export abstract class TenantBaseService {
    constructor(
        protected userOrganizationRoleRepository: Repository<UserOrganizationRole>,
    ) {}

    protected async getUserOrganizationIds(user: User): Promise<number[]> {
        const ids = new Set<number>();
        if (user.organizationId) ids.add(user.organizationId);
        if (Array.isArray((user as any).userOrganizationRoles)) {
            for (const r of (user as any).userOrganizationRoles) {
                if (r?.organizationId) ids.add(r.organizationId);
            }
        }
        const rows = await this.userOrganizationRoleRepository.find({ 
            where: { userId: user.id }, 
            select: ['organizationId'] 
        });
        for (const row of rows) {
            if (row.organizationId) ids.add(row.organizationId);
        }
        return Array.from(ids);
    }

    protected async validateOrganizationAccess(
        user: User,
        contextOrgId?: number
    ): Promise<number> {
        const allowedOrgIds = await this.getUserOrganizationIds(user);
        if (allowedOrgIds.length === 0) {
            throw new ForbiddenException('Organization context required');
        }

        if (contextOrgId) {
            if (!allowedOrgIds.includes(contextOrgId)) {
                throw new ForbiddenException('You do not have access to this organization');
            }
            return contextOrgId;
        }

        return allowedOrgIds[0];
    }
}
