// Permission scopes - defines the boundary of access
export enum PermissionScope {
  GLOBAL = 'global',        // Access to all resources across all companies
  COMPANY = 'company',      // Access to resources within user's company
  DEPARTMENT = 'department', // Access to resources within user's department
  TEAM = 'team',           // Access to resources within user's team
  SELF = 'self',           // Access only to resources owned by the user
}

// Scope hierarchy - higher scopes include lower scopes
export const SCOPE_HIERARCHY: Record<PermissionScope, PermissionScope[]> = {
  [PermissionScope.GLOBAL]: [
    PermissionScope.COMPANY,
    PermissionScope.DEPARTMENT,
    PermissionScope.TEAM,
    PermissionScope.SELF,
  ],
  [PermissionScope.COMPANY]: [
    PermissionScope.DEPARTMENT,
    PermissionScope.TEAM,
    PermissionScope.SELF,
  ],
  [PermissionScope.DEPARTMENT]: [
    PermissionScope.TEAM,
    PermissionScope.SELF,
  ],
  [PermissionScope.TEAM]: [
    PermissionScope.SELF,
  ],
  [PermissionScope.SELF]: [],
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
export function AND(...permissions: string[]): PermissionRequirement {
  return {
    operator: PermissionOperator.AND,
    permissions,
  };
}

export function OR(...permissions: string[]): PermissionRequirement {
  return {
    operator: PermissionOperator.OR,
    permissions,
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

  // Lead Management
  Lead: {
    READ: 'lead:read',
    CREATE: 'lead:create',
    UPDATE: 'lead:update',
    DELETE: 'lead:delete',
    ASSIGN: 'lead:assign',
  },

  // Deal Management
  Deal: {
    READ: 'deal:read',
    CREATE: 'deal:create',
    UPDATE: 'deal:update',
    DELETE: 'deal:delete',
    APPROVE: 'deal:approve',
    CLOSE: 'deal:close',
  },

  // Account Management
  Account: {
    READ: 'account:read',
    CREATE: 'account:create',
    UPDATE: 'account:update',
    DELETE: 'account:delete',
  },
} as const;

// Type helper for permission values
export type Permission = typeof Permissions[keyof typeof Permissions][keyof typeof Permissions[keyof typeof Permissions]];

// Get all permission keys as array (useful for seeding)
export function getAllPermissionKeys(): string[] {
  const keys: string[] = [];
  Object.values(Permissions).forEach(resource => {
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
