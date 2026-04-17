import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permission.decorator';
import { IAbilityFactory } from '../interfaces';
import { PermissionOperator, Owner } from '@libs/common';

const OWNER_STRING = Owner.toString(); // 'Symbol(OWNER)'

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
                    user,
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
        user: any,
    ): Promise<boolean> {
        const checks: boolean[] = [];
        for (const perm of permissions) {
            if (perm === OWNER_STRING) {
                // Handle Owner symbol that was stringified inside OR()/AND()
                checks.push(await this.checkOwnership(request, user));
            } else {
                const [resource, action] = perm.split(':');
                // Always use the parsed resource string, not request.resource (which is an entity object)
                checks.push(ability.can(action, resource));
            }
        }
        if (operator === PermissionOperator.AND) {
            return checks.every(check => check);
        } else {
            return checks.some(check => check);
        }
    }
    private async checkOwnership(request: any, user: any): Promise<boolean> {
        const resource = request.resource;
        if (!resource) return false;
        return resource.userId === user.id || resource.ownerId === user.id || resource.createdById === user.id;
    }
}
