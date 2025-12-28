import { User } from '../../auth/user/user.entity';
import { PermissionScope } from '@libs/common';

// Injection tokens
export const IPermissionReader = Symbol('IPermissionReader');
export const IPermissionWriter = Symbol('IPermissionWriter');
export const IRoleManager = Symbol('IRoleManager');
export const IPermissionsService = Symbol('IPermissionsService');

export interface IPermissionReader {
    getUserPermissions(userId: number): Promise<string[]>;
    getUserPermissionsWithScope(userId: number): Promise<Array<{ key: string; scope: PermissionScope }>>;
    getUserRoles(userId: number): Promise<Array<{ id: number; name: string; description?: string }>>;
}
export interface IPermissionWriter {
    assignRoleToUser(userId: number, roleId: number): Promise<void>;
    removeRoleFromUser(userId: number, roleId: number): Promise<void>;
    assignPermissionToRole(roleId: number, permissionKey: string, scope: PermissionScope): Promise<void>;
    removePermissionFromRole(roleId: number, permissionKey: string): Promise<void>;
}
export interface IRoleManager {
    getAllRoles(): Promise<Array<{ id: number; name: string; description?: string }>>;
    createRole(name: string, description?: string): Promise<{ id: number; name: string }>;
    deleteRole(roleId: number): Promise<void>;
}
export interface IPermissionsService extends IPermissionReader, IPermissionWriter, IRoleManager { }
