# 10 — Shared Library (`libs/common`)

## Overview

The shared library lives at `libs/common/` and is imported by all apps using the `@libs/common` alias (configured in `tsconfig.json`). It provides shared types, events, permission constants, and utility functions used across the monorepo.

**Entry point:** `libs/common/src/index.ts`

---

## Exported Modules

```typescript
// libs/common/src/index.ts
export * from './common.module';
export * from './common.service';
export * from './constants';
export * from './events/send-email.command';
export * from './events/user-created.event';
export * from './types';
export * from './permissions/permissions.constants';
```

---

## CommonModule

**File:** `libs/common/src/common.module.ts`

```typescript
@Module({
  providers: [CommonService],
  exports: [CommonService, UserCreatedEvent],
})
export class CommonModule {}
```

Import `CommonModule` into any NestJS module to get access to `CommonService` and `UserCreatedEvent`.

---

## CommonService

**File:** `libs/common/src/common.service.ts`

Minimal utility service. Currently provides basic helper methods shared across apps. Import via `@libs/common`.

---

## Constants

**File:** `libs/common/src/constants.ts`

```typescript
EVENTS = {
  USER_CREATED: 'user.created',   // Published on user registration
  USER_UPDATED: 'user.updated',   // Published on user profile update
}

ACTIONS = {
  SEND_EMAIL: 'send_email',       // TCP event pattern to email-service
}

EMAIL_TEMPLATES = {
  WELCOME_EMAIL: 'welcome-email', // Folder name in static/email-templates/
}
```

---

## Events

### UserCreatedEvent

**File:** `libs/common/src/events/user-created.event.ts`

```typescript
export class UserCreatedEvent {
  constructor(public readonly user: User) {}
}
```

Published by `AuthService.register()` via CQRS `EventBus.publish()`. Handled by `UserCreatedHandler` in the CRM emails module.

### SendEmailCommand

**File:** `libs/common/src/events/send-email.command.ts`

```typescript
export class SendEmailCommand {
  public readonly action: 'send_email' = ACTIONS.SEND_EMAIL;

  constructor(
    public readonly eventType: string,   // Event that triggered this
    public readonly recipient: string,   // Target email address
    public readonly data: EmailData,     // Template + subject + context
  ) {}
}
```

Used in two places:
- **CRM app** — `SendEmailHandler` executes it by emitting TCP event to email-service
- **Email service** — `EmailCommandHandler` executes it by enqueuing a BullMQ job

---

## Types

**Directory:** `libs/common/src/types/`

### JwtPayload

```typescript
interface JwtPayload {
  id: number;
  email: string;
  organizationId?: number;
  iat?: number;
  exp?: number;
}
```

Shape of the data encoded in the JWT access token.

### EmailData

```typescript
interface EmailData {
  template: string;          // Template folder name (e.g., 'welcome-email')
  context: Record<string, any>;  // Variables passed to Handlebars template
  subject?: string;          // Email subject line
}
```

### LoginResponse / RegisterResponse

Typed response shapes for auth endpoints.

---

## Permission Constants

**File:** `libs/common/src/permissions/permissions.constants.ts`

This is the heart of the RBAC system. It defines everything needed to declare and check permissions.

### PermissionScope Enum

```typescript
enum PermissionScope {
  GLOBAL     = 'global',
  COMPANY    = 'company',
  DEPARTMENT = 'department',
  TEAM       = 'team',
  SELF       = 'self',
  OWNER      = 'owner',
}
```

### SCOPE_HIERARCHY

Defines which scopes include which. A user with `GLOBAL` scope also satisfies `COMPANY`, `DEPARTMENT`, `TEAM`, `SELF`, and `OWNER` checks:

```typescript
SCOPE_HIERARCHY = {
  global:     [company, department, team, self, owner],
  company:    [department, team, self, owner],
  department: [team, self, owner],
  team:       [self, owner],
  self:       [owner],
  owner:      [],
}
```

### PermissionOperator Enum

```typescript
enum PermissionOperator {
  AND = 'AND',
  OR  = 'OR',
}
```

### PermissionRequirement Interface

```typescript
interface PermissionRequirement {
  operator?: PermissionOperator;
  permissions: string[];
}
```

### Owner Symbol

```typescript
const Owner = Symbol('OWNER');
```

Used in `@Permission(OR(Owner, 'lead:update'))` to mean "allow if the user owns the resource."

### OR() and AND() Helpers

```typescript
function OR(...permissions: (string | symbol)[]): PermissionRequirement
function AND(...permissions: (string | symbol)[]): PermissionRequirement
```

Symbols are converted via `.toString()` before being stored. The `PermissionGuard` recognizes `Symbol(OWNER).toString()` as the ownership check.

### Core Permissions Object

```typescript
Permissions = {
  User: {
    READ:   'user:read',
    CREATE: 'user:create',
    UPDATE: 'user:update',
    DELETE: 'user:delete',
  },
  Organization: {
    READ:         'organization:read',
    CREATE:       'organization:create',
    UPDATE:       'organization:update',
    DELETE:       'organization:delete',
    MANAGE_USERS: 'organization:manage_users',
  },
  Role: {
    READ:   'role:read',
    CREATE: 'role:create',
    UPDATE: 'role:update',
    DELETE: 'role:delete',
  },
  // (Content permissions also present but not used by CRM domain modules)
}
```

### Dynamic Module Registration

```typescript
const ExtendedPermissions: Record<string, Record<string, string>> = {};

function registerModulePermissions(moduleName: string, permissions: Record<string, string>): void {
  ExtendedPermissions[moduleName] = permissions;
}
```

Each domain module calls `registerModulePermissions()` at import time (module load), adding itself to `ExtendedPermissions`. The seed script imports all permission files to trigger registration before calling `getAllPermissionKeys()`.

### Utility Functions

#### `getAllPermissions()`

Returns `{ ...Permissions, ...ExtendedPermissions }` — the union of core and all registered module permissions.

#### `getAllPermissionKeys(): string[]`

Flattens all permission values from `getAllPermissions()` into a `string[]`. Used by the seed script to assign every permission to the superadmin role.

#### `parsePermissionKey(key: string): { resource, action }`

Splits `'lead:read'` → `{ resource: 'lead', action: 'read' }`.

---

## TypeScript Path Alias

**`tsconfig.json`** (root):
```json
{
  "compilerOptions": {
    "paths": {
      "@libs/common": ["libs/common/src/index.ts"],
      "@libs/common/*": ["libs/common/src/*"]
    }
  }
}
```

Import pattern used across the project:
```typescript
import { SendEmailCommand, ACTIONS, Owner, OR } from '@libs/common';
```

---

## Usage Patterns

### In CRM app

```typescript
import { UserCreatedEvent, EVENTS } from '@libs/common';

// Publish after registration
this.eventBus.publish(new UserCreatedEvent(user));
```

```typescript
import { Owner, OR, LeadPermissions } from '@libs/common'; // LeadPermissions from leads module
// in controller:
@Permission(OR(Owner, LeadPermissions.UPDATE))
```

### In email-service

```typescript
import { SendEmailCommand, ACTIONS } from '@libs/common';

@EventPattern(ACTIONS.SEND_EMAIL)
async handleSendEmail(@Payload() data: any) {
  return this.commandBus.execute(
    new SendEmailCommand(ACTIONS.SEND_EMAIL, data.recipient, data)
  );
}
```
