import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, UserRole, RolePermission } from '../entities';
import { PermissionScope } from '@libs/common';
import { IPermissionsService } from '../interfaces';
export interface PermissionWithScope {
    key: string;
    scope: PermissionScope;
}
@Injectable()
export class PermissionsService implements IPermissionsService {
    constructor(
        @InjectRepository(Role)
        private roleRepository: Repository<Role>,
        @InjectRepository(UserRole)
        private userRoleRepository: Repository<UserRole>,
        @InjectRepository(RolePermission)
        private rolePermissionRepository: Repository<RolePermission>,
    ) { }
    async getUserPermissions(userId: number): Promise<string[]> {
        const userRoles = await this.userRoleRepository.find({
            where: { userId },
            relations: ['role', 'role.rolePermissions'],
        });
        const permissionsSet = new Set<string>();
        for (const userRole of userRoles) {
            if (!userRole.role?.isActive) continue;
            for (const rolePermission of userRole.role.rolePermissions || []) {
                permissionsSet.add(rolePermission.permissionKey);
            }
        }
        return Array.from(permissionsSet);
    }
    async getUserPermissionsWithScope(userId: number): Promise<PermissionWithScope[]> {
        const userRoles = await this.userRoleRepository.find({
            where: { userId },
            relations: ['role', 'role.rolePermissions'],
        });
        const permissionsMap = new Map<string, PermissionScope>();
        for (const userRole of userRoles) {
            if (!userRole.role?.isActive) continue;
            for (const rolePermission of userRole.role.rolePermissions || []) {
                const key = rolePermission.permissionKey;
                const scope = rolePermission.scope;
                const existingScope = permissionsMap.get(key);
                if (!existingScope || this.isBroaderScope(scope, existingScope)) {
                    permissionsMap.set(key, scope);
                }
            }
        }
        return Array.from(permissionsMap.entries()).map(([key, scope]) => ({
            key,
            scope,
        }));
    }
    private isBroaderScope(scope1: PermissionScope, scope2: PermissionScope): boolean {
        const hierarchy = [
            PermissionScope.GLOBAL,
            PermissionScope.COMPANY,
            PermissionScope.DEPARTMENT,
            PermissionScope.TEAM,
            PermissionScope.SELF,
        ];
        return hierarchy.indexOf(scope1) < hierarchy.indexOf(scope2);
    }
    async getUserRoles(userId: number): Promise<Array<{ id: number; name: string; description?: string }>> {
        const userRoles = await this.userRoleRepository.find({
            where: { userId },
            relations: ['role'],
        });
        return userRoles
            .filter((ur) => ur.role?.isActive)
            .map((ur) => ({
                id: ur.role.id,
                name: ur.role.name,
                description: ur.role.description,
            }));
    }
    async assignRoleToUser(userId: number, roleId: number): Promise<void> {
        const existing = await this.userRoleRepository.findOne({
            where: { userId, roleId },
        });
        if (existing) return;
        const userRole = this.userRoleRepository.create({ userId, roleId });
        await this.userRoleRepository.save(userRole);
    }
    async removeRoleFromUser(userId: number, roleId: number): Promise<void> {
        await this.userRoleRepository.delete({ userId, roleId });
    }
    async assignPermissionToRole(
        roleId: number,
        permissionKey: string,
        scope: PermissionScope,
    ): Promise<void> {
        const existing = await this.rolePermissionRepository.findOne({
            where: { roleId, permissionKey },
        });
        if (existing) {
            existing.scope = scope;
            await this.rolePermissionRepository.save(existing);
            return;
        }
        const rolePermission = this.rolePermissionRepository.create({
            roleId,
            permissionKey,
            scope,
        });
        await this.rolePermissionRepository.save(rolePermission);
    }
    async removePermissionFromRole(roleId: number, permissionKey: string): Promise<void> {
        await this.rolePermissionRepository.delete({ roleId, permissionKey });
    }
    async getAllRoles(): Promise<Array<{ id: number; name: string; description?: string }>> {
        const roles = await this.roleRepository.find({ where: { isActive: true } });
        return roles.map(role => ({
            id: role.id,
            name: role.name,
            description: role.description,
        }));
    }
    async createRole(name: string, description?: string): Promise<{ id: number; name: string; description?: string }> {
        const role = this.roleRepository.create({ name, description });
        const saved = await this.roleRepository.save(role);
        return {
            id: saved.id,
            name: saved.name,
            description: saved.description,
        };
    }
    async deleteRole(roleId: number): Promise<void> {
        await this.roleRepository.update(roleId, { isActive: false });
    }
}
