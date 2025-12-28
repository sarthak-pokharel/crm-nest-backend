// Permission scopes - defines the boundary of access
export enum PermissionScope {
  GLOBAL = 'global',        // Access to all resources across all companies
  COMPANY = 'company',      // Access to resources within user's company
  DEPARTMENT = 'department', // Access to resources within user's department
  TEAM = 'team',           // Access to resources within user's team
  SELF = 'self',           // Access only to resources owned by the user
  OWNER = 'owner',         // Full access to resources created by the user
}

// Scope hierarchy - higher scopes include lower scopes
export const SCOPE_HIERARCHY: Record<PermissionScope, PermissionScope[]> = {
  [PermissionScope.GLOBAL]: [
    PermissionScope.COMPANY,
    PermissionScope.DEPARTMENT,
    PermissionScope.TEAM,
    PermissionScope.SELF,
    PermissionScope.OWNER,
  ],
  [PermissionScope.COMPANY]: [
    PermissionScope.DEPARTMENT,
    PermissionScope.TEAM,
    PermissionScope.SELF,
    PermissionScope.OWNER,
  ],
  [PermissionScope.DEPARTMENT]: [
    PermissionScope.TEAM,
    PermissionScope.SELF,
    PermissionScope.OWNER,
  ],
  [PermissionScope.TEAM]: [
    PermissionScope.SELF,
    PermissionScope.OWNER,
  ],
  [PermissionScope.SELF]: [
    PermissionScope.OWNER,
  ],
  [PermissionScope.OWNER]: [],
};

// Permission operators for combining permissions
export enum PermissionOperator {
  AND = 'AND',
  OR = 'OR',
}

// Permission requirement structure
export interface PermissionRequirement {
  operator?: PermissionOperator;
  permissions: string[];
}

// Special symbols
export const Owner = Symbol('OWNER');

// Helper functions to create permission requirements
export function AND(...permissions: (string | symbol)[]): PermissionRequirement {
  return {
    operator: PermissionOperator.AND,
    permissions: permissions.map(p => (typeof p === 'symbol' ? p.toString() : p)),
  };
}

export function OR(...permissions: (string | symbol)[]): PermissionRequirement {
  return {
    operator: PermissionOperator.OR,
    permissions: permissions.map(p => (typeof p === 'symbol' ? p.toString() : p)),
  };
}

// ===== Permission Constants =====
// Each module can extend this by adding their own permissions
// Format: resource:action (e.g., 'lead:read', 'deal:approve')

export const Permissions = {
  // User Management
  User: {
    READ: 'user:read',
    CREATE: 'user:create',
    UPDATE: 'user:update',
    DELETE: 'user:delete',
  },

  // Organization Management
  Organization: {
    READ: 'organization:read',
    CREATE: 'organization:create',
    UPDATE: 'organization:update',
    DELETE: 'organization:delete',
    MANAGE_USERS: 'organization:manage_users',
  },

  // Role Management
  Role: {
    READ: 'role:read',
    CREATE: 'role:create',
    UPDATE: 'role:update',
    DELETE: 'role:delete',
  },

  // Permission Management
  Permission: {
    READ: 'permission:read',
    ASSIGN: 'permission:assign',
  },

  // Content Management
  Content: {
    READ: 'content:read',
    CREATE: 'content:create',
    UPDATE: 'content:update',
    DELETE: 'content:delete',
    PUBLISH: 'content:publish',
  },

} as const;

// Allow modules to extend permissions dynamically
export const ExtendedPermissions: Record<string, Record<string, string>> = {};

/**
 * Register module-specific permissions
 * @param moduleName - Name of the module (e.g., 'Lead', 'Company')
 * @param permissions - Permission object for the module
 */
export function registerModulePermissions(
  moduleName: string,
  permissions: Record<string, string>,
): void {
  ExtendedPermissions[moduleName] = permissions;
}

/**
 * Get all permissions including core and extended module permissions
 */
export function getAllPermissions() {
  return { ...Permissions, ...ExtendedPermissions };
}

// Type helper for permission values
export type Permission = typeof Permissions[keyof typeof Permissions][keyof typeof Permissions[keyof typeof Permissions]];

// Get all permission keys as array (useful for seeding)
export function getAllPermissionKeys(): string[] {
  const keys: string[] = [];
  const allPermissions = getAllPermissions();
  Object.values(allPermissions).forEach(resource => {
    Object.values(resource).forEach(permission => {
      keys.push(permission);
    });
  });
  return keys;
}

// Extract resource and action from permission key
export function parsePermissionKey(key: string): { resource: string; action: string } {
  const [resource, action] = key.split(':');
  return { resource, action };
}
