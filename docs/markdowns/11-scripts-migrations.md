# 11 — Scripts & Migrations

## Overview

The `scripts/` directory contains CLI tools for database migrations and data seeding. All scripts use TypeScript with `ts-node` and connect to the same PostgreSQL instance used by the CRM app.

---

## Migration System

### Configuration

**File:** `scripts/data-source.ts`

```typescript
import { DataSource } from 'typeorm';
import 'dotenv/config';
import { createTypeOrmConfig } from '../apps/crm/src/typeorm.config.shared';

export const AppDataSource = new DataSource(createTypeOrmConfig());
```

`createTypeOrmConfig()` reads `DATABASE_URL` (or individual `DB_*` env vars) and points to the same entity glob as the running app. This is used by the TypeORM CLI.

**`synchronize: false`** — The schema is **never auto-synced**. All schema changes must go through migrations.

### Migration Files

**Location:** `apps/crm/src/migrations/`

Current migration:

| File | Timestamp | Description |
|------|-----------|-------------|
| `1766951074630-init.ts` | 1766951074630 | Full initial schema — creates all tables |

The init migration creates these tables in order:
1. `user_roles` (with unique index on `userId+roleId`)
2. `role_permissions` (with scope enum + unique index on `roleId+permissionKey`)
3. `roles`
4. `user_organization_roles`
5. `user` (with org FK)
6. `organizations`
7. `companies`
8. `contacts`
9. `deals` (with stage + priority enums)
10. `activities` (with type + relationType enums)
11. `leads` (with status + source enums)
12. `tasks` (with status + priority enums)

Plus all foreign key constraints between tables.

---

## scripts/migration.ts

**Run via:** `pnpm migration:<cmd>`

```
pnpm migration:run       → ts-node scripts/migration.ts run
pnpm migration:revert    → ts-node scripts/migration.ts revert
pnpm migration:generate  → ts-node scripts/migration.ts generate <MigrationName>
```

### Commands

#### `run`

```typescript
await dataSource.runMigrations();
```

Runs all pending migrations in `apps/crm/src/migrations/` that haven't been applied yet (tracked in `migrations` table).

#### `revert`

```typescript
await dataSource.undoLastMigration();
```

Reverts the most recently applied migration.

#### `generate <Name>`

```bash
pnpm exec typeorm-ts-node-commonjs migration:generate \
  apps/crm/src/migrations/<Name> \
  -d scripts/data-source.ts
```

Compares current entity state to the DB and generates a new migration file with the diff.

> **Important:** Run `pnpm migration:generate <DescriptiveName>` after modifying entities. Then review the generated file before running `pnpm migration:run`.

---

## scripts/seed-permissions.ts

**Run via:** `pnpm seed:permissions`

### What it does

1. **Imports all module permission files** (side-effect imports) to register them via `registerModulePermissions()`:
   - `company.permissions`
   - `leads.permissions`
   - `contacts.permissions`
   - `deals.permissions`
   - `activities.permissions`
   - `tasks.permissions`

2. **Collects all permission keys** — calls `getAllPermissionKeys()` from `@libs/common` plus manually adds module permissions to ensure completeness.

3. **Creates `superadmin` role** (idempotent — skips if exists)

4. **Assigns ALL permissions** to the superadmin role with `INSERT ... ON CONFLICT DO NOTHING` — all at scope `global` (the default in the `role_permissions.scope` enum default)

5. **Creates `Default Organization`** with slug `default` (idempotent)

6. **Creates superadmin user** `admin@crm.local` / `Admin@123456`:
   - Password hashed with bcrypt (cost 10)
   - Set `isActive = true`, linked to default org
   - Assigns the superadmin role via `user_roles`

### Idempotency

All inserts check for existence first (`SELECT ... WHERE ...`). Safe to run multiple times. Existing records are preserved.

### Full permission list seeded

| Module | Permissions |
|--------|-------------|
| User | `user:read`, `user:create`, `user:update`, `user:delete` |
| Organization | `organization:read`, `:create`, `:update`, `:delete`, `:manage_users` |
| Role | `role:read`, `role:create`, `role:update`, `role:delete` |
| Company | `company:read`, `:create`, `:update`, `:delete` |
| Lead | `lead:read`, `:create`, `:update`, `:delete`, `:assign` |
| Contact | `contact:read`, `:create`, `:update`, `:delete` |
| Deal | `deal:read`, `:create`, `:update`, `:delete`, `:approve`, `:close` |
| Activity | `activity:read`, `:create`, `:update`, `:delete` |
| Task | `task:read`, `:create`, `:update`, `:delete`, `:complete` |

---

## scripts/seed-demo-data.ts

**Run via:** `pnpm seed:demo`

### What it seeds

Populates the database with realistic sample data for development and testing:

#### Organizations

| Name | Slug |
|------|------|
| Acme Corporation | `acme-corporation` |
| Summit Ventures | `summit-ventures` |

#### Roles

| Name | Description |
|------|-------------|
| `admin` | Full admin access |
| `sales_manager` | Sales management |
| `sales_rep` | Sales representative |

#### Users

| User | Role | Org |
|------|------|-----|
| Alice Admin | admin | Acme Corporation |
| Bob Sales | sales_manager | Acme Corporation |
| (additional users) | sales_rep | Various |

#### CRM Data

- Sample Leads (various statuses)
- Sample Deals (various stages including closed)
- Sample Companies
- Sample Contacts linked to companies
- Sample Tasks (some overdue)
- Sample Activities (calls, meetings, notes)

### Idempotency

Uses `ON CONFLICT DO NOTHING` or existence checks throughout. Safe to re-run.

---

## Recommended Seed Order

1. **Migrations must run first:**
   ```bash
   pnpm migration:run
   ```

2. **Seed permissions (creates superadmin + default org):**
   ```bash
   pnpm seed:permissions
   ```

3. **Seed demo data:**
   ```bash
   pnpm seed:demo
   ```

> `seed:demo` depends on the tables existing (created by migration) and the superadmin role existing (created by `seed:permissions`).

---

## typeorm.config.shared.ts

**File:** `apps/crm/src/typeorm.config.shared.ts`

Used by both the running app (via `app.module.ts`) and the migration CLI (via `scripts/data-source.ts`):

```typescript
export function createTypeOrmConfig(configService?: ConfigService): DataSourceOptions {
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/**{.ts,.js}'],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
  };
}
```

The entity glob covers all `*.entity.ts` files under `apps/crm/src/` automatically — no manual entity registration required.

---

## Adding a New Migration

1. Modify an entity (add/remove columns, change types, etc.)
2. Generate the migration:
   ```bash
   pnpm migration:generate AddLeadScoreIndex
   ```
3. Review `apps/crm/src/migrations/<timestamp>-AddLeadScoreIndex.ts`
4. Apply it:
   ```bash
   pnpm migration:run
   ```
5. To undo:
   ```bash
   pnpm migration:revert
   ```
