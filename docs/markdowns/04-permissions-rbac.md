# 04 — Permissions & RBAC

## Overview

The permission system is built on **CASL v6** with a custom hierarchical scope model. It controls what actions each user can perform on which resources, across multiple organizations.

---

## Architecture Components

| Component | File | Role |
|-----------|------|------|
| `PermissionGuard` | `permissions/guards/permission.guard.ts` | Intercepts every guarded request, evaluates `@Permission()` requirements |
| `@Permission()` decorator | `permissions/decorators/permission.decorator.ts` | Declares required permissions on a controller handler |
| `AbilityFactory` | `permissions/casl/` | Builds CASL `Ability` object for a given user |
| `PermissionsService` | `permissions/services/permissions.service.ts` | Resolves user permissions from DB |
| `RolesController` | `permissions/controllers/roles.controller.ts` | CRUD for roles and permission assignments |
| `RolePermission` entity | `permissions/entities/role-permission.entity.ts` | Stores `roleId` + `permissionKey` + `scope` |
| `UserRole` entity | `permissions/entities/user-role.entity.ts` | Global role assignment |
| `UserOrganizationRole` entity | `auth/organization/user-organization-role.entity.ts` | Per-org role assignment |
| Permission constants | `libs/common/src/permissions/permissions.constants.ts` | All keys, scopes, `OR()`, `AND()`, `Owner` |

---

## Permission Scope Hierarchy

Scopes define the **breadth** of a user's access. A broader scope includes all narrower scopes.

```
GLOBAL
  └─► can access everything
COMPANY
  └─► can access resources within the user's company
DEPARTMENT
  └─► can access resources within the user's department
TEAM
  └─► can access resources within the user's team
SELF
  └─► can access resources assigned to themselves
OWNER
  └─► can access resources they personally created/own
```

Hierarchy table (index 0 = broadest):

| Index | Scope | DB value |
|-------|-------|----------|
| 0 | GLOBAL | `global` |
| 1 | COMPANY | `company` |
| 2 | DEPARTMENT | `department` |
| 3 | TEAM | `team` |
| 4 | SELF | `self` |
| 5 | OWNER | `owner` |

When a user has the same permission from multiple roles with different scopes, the **broadest** (lowest index) scope is kept.

---

## Permission Key Format

All permission keys follow `resource:action` format:

```
lead:read
lead:create
lead:update
lead:delete
lead:assign
deal:read
deal:create
deal:update
deal:delete
deal:approve
deal:close
contact:read
contact:create
contact:update
contact:delete
company:read
company:create
company:update
company:delete
activity:read
activity:create
activity:update
activity:delete
task:read
task:create
task:update
task:delete
task:complete
user:read
user:create
user:update
user:delete
organization:read
organization:create
organization:update
organization:delete
organization:manage_users
role:read
role:create
role:update
role:delete
```

---

## Module Permission Registration

Each domain module registers its own permissions via `registerModulePermissions()` from `@libs/common`:

```typescript
// leads.permissions.ts
import { registerModulePermissions } from '@libs/common';

export const LeadPermissions = {
  READ: 'lead:read',
  CREATE: 'lead:create',
  UPDATE: 'lead:update',
  DELETE: 'lead:delete',
  ASSIGN: 'lead:assign',
} as const;

registerModulePermissions('Lead', LeadPermissions);
```

This pattern is followed by every module:

| Module | Exported constant | Permission prefix |
|--------|------------------|------------------|
| `leads` | `LeadPermissions` | `lead:` |
| `deals` | `DealPermissions` | `deal:` |
| `contacts` | `ContactPermissions` | `contact:` |
| `company` | `CompanyPermissions` | `company:` |
| `activities` | `ActivityPermissions` | `activity:` |
| `tasks` | `TaskPermissions` | `task:` |

Core permissions (User, Organization, Role) are defined directly in `libs/common/src/permissions/permissions.constants.ts` under the `Permissions` object.

---

## The @Permission() Decorator

**File:** `apps/crm/src/permissions/decorators/permission.decorator.ts`

Stores permission requirements in NestJS metadata under the key `'permissions'`.

### Usage Patterns

**Single permission:**
```typescript
@Permission(LeadPermissions.READ)
// → requires lead:read
```

**Owner OR permission:**
```typescript
@Permission(OR(Owner, LeadPermissions.UPDATE))
// → passes if user is the resource owner OR has lead:update
```

**Multiple permissions (each is OR'd together):**
```typescript
@Permission(OR(Owner, DealPermissions.DELETE))
// → same as above for delete
```

**AND combinator (both required):**
```typescript
@Permission(AND(DealPermissions.UPDATE, DealPermissions.APPROVE))
// → requires both deal:update AND deal:approve
```

**Owner only:**
```typescript
@Permission(Owner)
// → passes only if user is the resource owner
```

---

## PermissionGuard

**File:** `apps/crm/src/permissions/guards/permission.guard.ts`

Applied via `@UseGuards(JwtAuthGuard, PermissionGuard)` — always after `JwtAuthGuard` since it needs `request.user`.

### Evaluation Logic

```
1. Read requirements from @Permission() metadata
2. If no requirements → allow (open endpoint)
3. Get request.user (set by JwtAuthGuard)
4. Build CASL Ability via AbilityFactory.createForUser(user)
5. For each requirement in the array:
   a. If requirement.checkOwnership = true:
      → call checkOwnership(request, user)
      → checks request.resource.userId | .ownerId | .createdById === user.id
      → if true → ALLOW and return
   b. If requirement has .permissions array:
      → for each permission string:
           if it's 'Symbol(OWNER)' → call checkOwnership()
           else split 'resource:action' → ability.can(action, resource)
      → if operator = AND → all must pass
      → if operator = OR  → any must pass
      → if true → ALLOW and return
6. If no requirement passes → throw ForbiddenException('Insufficient permissions')
```

### Owner Check

```typescript
private async checkOwnership(request, user): Promise<boolean> {
  const resource = request.resource;  // loaded by interceptors (e.g., OrganizationInterceptor)
  if (!resource) return false;
  return resource.userId === user.id
      || resource.ownerId === user.id
      || resource.createdById === user.id;
}
```

Resource must be loaded onto `request.resource` by an interceptor before the guard runs. Only `OrganizationController` has the `OrganizationInterceptor` that does this. Domain controllers (leads, deals, etc.) do not use interceptors — they rely on the `PermissionsService` + CASL ability check.

---

## PermissionsService

**File:** `apps/crm/src/permissions/services/permissions.service.ts`

### Methods

#### `getUserPermissions(userId: number): Promise<string[]>`

Returns flat list of permission keys for the user (combining global + org roles, deduped).

1. Fetches `user_roles` + joined `role_permissions` for the user
2. Fetches `user_organization_roles` + joined `role_permissions`
3. Merges into a `Set<string>`, returns as array

#### `getUserPermissionsWithScope(userId: number): Promise<PermissionWithScope[]>`

Returns permission keys with their resolved scope (broadest wins).

1. Same as above but builds a `Map<string, PermissionScope>`
2. For duplicates, keeps the scope with lower hierarchy index (broader)
3. Returns `Array<{ key: string, scope: PermissionScope }>`

#### `getUserRoles(userId: number): Promise<Role[]>`

Returns active roles assigned globally to the user.

#### `assignRoleToUser(userId: number, roleId: number): Promise<void>`

Creates `UserRole` record if it doesn't already exist (idempotent).

#### `removeRoleFromUser(userId: number, roleId: number): Promise<void>`

Deletes the `UserRole` record.

#### `assignPermissionToRole(roleId, permissionKey, scope): Promise<void>`

Upserts a `RolePermission`. If the key already exists for that role, updates the scope.

---

## RolesController

**File:** `apps/crm/src/permissions/controllers/roles.controller.ts`  
**Base path:** `/api/roles`  
**Guards:** `JwtAuthGuard`, `PermissionGuard`

### Endpoints

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/roles` | `role:read` | List all active roles |
| `GET` | `/roles/:id` | `role:read` | Get role by ID |
| `POST` | `/roles` | `role:create` | Create new role |
| `PUT` | `/roles/:id` | `role:update` | Update role name/description/isActive |
| `GET` | `/roles/:id/permissions` | `role:read` | Get all permission keys for a role |
| `PUT` | `/roles/:id/permissions` | `role:update` | Replace a role's permissions (full replace) |

### Inline DTOs in RolesController

**CreateRoleDto:**
| Field | Validator |
|-------|-----------|
| `name` | `@IsString()`, `@MaxLength(100)` |
| `description` | `@IsString()`, `@IsOptional()`, `@MaxLength(255)` |
| `isActive` | `@IsBoolean()`, `@IsOptional()` |

**UpdateRolePermissionsDto:**
| Field | Validator |
|-------|-----------|
| `permissions` | `@IsArray()`, array of `{ permissionKey: string }` |

When updating permissions for a role, the controller **replaces all** permissions for that role — it deletes existing `RolePermission` records for the role and inserts the new set.

---

## Permission Resolution in auth/me and auth/permissions

`AuthService.getPermissions(user, organizationId?)` is the endpoint-level resolver:

1. SQL query: global permissions from `user_roles` + `role_permissions`
2. SQL query: org permissions from `user_organization_roles` + `role_permissions` (if `organizationId` provided)
3. Deduplication with scope order array `['global', 'company', 'department', 'team', 'self', 'owner']`
4. Returns `{ userId, organizationId, permissions: [{ permission, scope }] }`

---

## Frontend Permission Utilities

### PermissionsProvider

**File:** `dashboard/lib/PermissionsProvider.tsx`

React context that:
- Calls `GET /api/auth/permissions` on mount (via `useUserPermissions`)
- Caches for 5 minutes (`staleTime`), GC after 10 minutes
- Exposes `permissions`, `isLoading`, `error`, `refetch` via context

### usePermissionCheck()

**File:** `dashboard/lib/usePermissionCheck.ts`

Hook providing convenience methods:

| Method | Description |
|--------|-------------|
| `can(permission, scope?)` | Check single permission |
| `canRead(resource, scope?)` | `resource:read` shorthand |
| `canCreate(resource, scope?)` | `resource:create` shorthand |
| `canUpdate(resource, scope?)` | `resource:update` shorthand |
| `canDelete(resource, scope?)` | `resource:delete` shorthand |
| `canAll(perms[], scope?)` | All permissions required |
| `canAny(perms[], scope?)` | Any permission suffices |
| `checkRequirement(req, scope?)` | Full requirement evaluation |

### PermissionGuard Component

**File:** `dashboard/components/permission-guard.tsx`

React component that conditionally renders children based on permission checks. Used throughout pages to show/hide buttons and actions depending on the user's role.

### usePermissions()

**File:** `dashboard/lib/usePermissionCheck.ts`

Simpler hook returning `{ permissions, isLoading, error }` — used by hooks.ts to delay data fetching until permissions are loaded:

```typescript
// All data hooks wait for permissions to load
const { isLoading: permissionsLoading } = usePermissions();
return useQuery({
  queryKey: ['leads'],
  queryFn: () => fetcher('/leads'),
  enabled: !permissionsLoading,
});
```

---

## Demo Role Setup (seed-demo-data.ts)

| Role | Permission Scope | Permissions |
|------|-----------------|-------------|
| `superadmin` | global (all) | All 40+ permission keys |
| `admin` | global | Full CRUD on all resources + manage_users |
| `sales_manager` | global | Read/write leads, deals, contacts, companies, activities, tasks; can approve/close deals; read users |
| `sales_rep` | global | Read/write contacts, leads, deals, activities, tasks; no delete on sensitive resources |
