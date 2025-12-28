import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permission.decorator';
import { IAbilityFactory } from '../interfaces';
import { PermissionOperator, Owner } from '@libs/common';
@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        @Inject(IAbilityFactory)
        private abilityFactory: IAbilityFactory,
    ) { }
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requirements = this.reflector.getAllAndOverride<any[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (!requirements || requirements.length === 0) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }
        const ability = await this.abilityFactory.createForUser(user);
        for (const req of requirements) {
            if (req.checkOwnership) {
                const isOwner = await this.checkOwnership(request, user);
                if (isOwner) return true;
                continue;
            }
            if (req.permissions) {
                const hasPermission = await this.checkPermissions(
                    req.permissions,
                    req.operator,
                    ability,
                    request,
                );
                if (hasPermission) return true;
            }
        }
        throw new ForbiddenException('Insufficient permissions');
    }
    private async checkPermissions(
        permissions: string[],
        operator: PermissionOperator | undefined,
        ability: any,
        request: any,
    ): Promise<boolean> {
        const checks = permissions.map(perm => {
            const [resource, action] = perm.split(':');
            const subject = request.resource || resource;
            return ability.can(action, subject);
        });
        if (operator === PermissionOperator.AND) {
            return checks.every(check => check);
        } else {
            return checks.some(check => check);
        }
    }
    private async checkOwnership(request: any, user: any): Promise<boolean> {
        const resourceId = request.params.id;
        const resource = request.resource;
        if (!resource) return false;
        // Check ownership by userId, ownerId, or createdById
        return resource.userId === user.id || resource.ownerId === user.id || resource.createdById === user.id;
    }
}
