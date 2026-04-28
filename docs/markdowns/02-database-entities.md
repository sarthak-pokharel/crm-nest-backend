# 02 — Database Entities

All domain entities extend `TenantBaseEntity`. Auth/permission entities are standalone.

---

## TenantBaseEntity (Abstract Base)

**File:** `apps/crm/src/common/base.entity.ts`

Every CRM domain entity (Lead, Deal, Contact, Company, Activity, Task) extends this abstract class. It is **not** decorated with `@Entity()` — subclasses provide that.

| Field | Type | Notes |
|-------|------|-------|
| `organizationId` | `number` | FK → `organizations.id`. Tenant boundary — all queries filter by this. |
| `organization` | `Organization` | ManyToOne relation |
| `createdById` | `number \| null` | FK → `user.id`. Audit — who created this record. |
| `createdBy` | `User` | ManyToOne relation |
| `updatedById` | `number \| null` | FK → `user.id`. Audit — who last updated. |
| `updatedBy` | `User` | ManyToOne relation |
| `createdAt` | `Date` | Auto-set by TypeORM `@CreateDateColumn` |
| `updatedAt` | `Date` | Auto-set by TypeORM `@UpdateDateColumn` |

---

## Entity Reference

### 1. User

**Table:** `user`  
**File:** `apps/crm/src/auth/user/user.entity.ts`  
**Extends:** `AggregateRoot` (from `@nestjs/cqrs` — enables event publishing)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `number` | PK, auto-increment | |
| `firstName` | `string` | NOT NULL | |
| `lastName` | `string` | NOT NULL | |
| `email` | `string` | UNIQUE, NOT NULL | Used for login |
| `password` | `string` | NOT NULL | bcrypt hash |
| `isActive` | `boolean` | DEFAULT true | Soft-disable flag |
| `organizationId` | `number \| null` | FK → `organizations.id` | Primary org context |
| `organization` | `Organization` | ManyToOne | |
| `companyId` | `number \| null` | — | Scope field: user's company within org |
| `departmentId` | `number \| null` | — | Scope field: user's department |
| `teamId` | `number \| null` | — | Scope field: user's team |
| `userRoles` | `UserRole[]` | OneToMany | Global role assignments |
| `userOrganizationRoles` | `UserOrganizationRole[]` | OneToMany | Per-org role assignments |

**Method:** `register()` — calls `this.apply(new UserCreatedEvent(this))` to publish domain event.

---

### 2. Organization

**Table:** `organizations`  
**File:** `apps/crm/src/auth/organization/organization.entity.ts`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `number` | PK, auto-increment | |
| `name` | `string` | UNIQUE, NOT NULL | Display name |
| `description` | `string \| null` | — | |
| `slug` | `string \| null` | UNIQUE | URL-friendly identifier, auto-generated from `name` |
| `isActive` | `boolean` | DEFAULT true | |
| `logo` | `string \| null` | — | URL to logo image |
| `website` | `string \| null` | — | |
| `settings` | `jsonb \| null` | — | Arbitrary org-level settings |
| `createdById` | `number \| null` | FK → `user.id` | Creator — used for Owner scope checks |
| `createdBy` | `User` | ManyToOne | |
| `users` | `User[]` | OneToMany | Users with this org as primary |
| `userOrganizationRoles` | `UserOrganizationRole[]` | OneToMany | All role assignments in this org |
| `createdAt` | `Date` | Auto | |
| `updatedAt` | `Date` | Auto | |

---

### 3. UserOrganizationRole

**Table:** `user_organization_roles`  
**File:** `apps/crm/src/auth/organization/user-organization-role.entity.ts`

Maps a user to an organization with a specific role (per-org RBAC).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `number` | PK | |
| `userId` | `number` | NOT NULL, CASCADE DELETE | FK → `user.id` |
| `organizationId` | `number` | NOT NULL, CASCADE DELETE | FK → `organizations.id` |
| `roleId` | `number` | NOT NULL, CASCADE DELETE | FK → `roles.id` |
| `user` | `User` | ManyToOne | |
| `organization` | `Organization` | ManyToOne | |
| `role` | `Role` | ManyToOne | |
| `createdAt` | `Date` | Auto | |

---

### 4. Role

**Table:** `roles`  
**File:** `apps/crm/src/permissions/entities/role.entity.ts`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `number` | PK | |
| `name` | `string` | UNIQUE, NOT NULL | e.g., `superadmin`, `admin`, `sales_rep` |
| `description` | `string \| null` | — | |
| `isActive` | `boolean` | DEFAULT true | Inactive roles are skipped in permission resolution |
| `createdAt` | `Date` | Auto | |
| `updatedAt` | `Date` | Auto | |
| `userRoles` | `UserRole[]` | OneToMany | |
| `rolePermissions` | `RolePermission[]` | OneToMany | |

---

### 5. UserRole

**Table:** `user_roles`  
**File:** `apps/crm/src/permissions/entities/user-role.entity.ts`  
**Index:** Unique on `(userId, roleId)`

Global (cross-org) role assignment for a user.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `number` | PK |
| `userId` | `number` | FK → `user.id`, CASCADE DELETE |
| `roleId` | `number` | FK → `roles.id`, CASCADE DELETE |
| `user` | `User` | ManyToOne |
| `role` | `Role` | ManyToOne |
| `createdAt` | `Date` | Auto |

---

### 6. RolePermission

**Table:** `role_permissions`  
**File:** `apps/crm/src/permissions/entities/role-permission.entity.ts`  
**Index:** Unique on `(roleId, permissionKey)`

Assigns a permission key + scope to a role.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `number` | PK | |
| `roleId` | `number` | NOT NULL, CASCADE DELETE | FK → `roles.id` |
| `permissionKey` | `string` | NOT NULL | e.g., `lead:read`, `deal:approve` |
| `scope` | `PermissionScope` | ENUM, DEFAULT `global` | Breadth of access |
| `conditions` | `jsonb \| null` | — | Optional additional conditions (reserved for future use) |
| `role` | `Role` | ManyToOne | |
| `createdAt` | `Date` | Auto | |

**PermissionScope enum values:** `global`, `company`, `department`, `team`, `self`, `owner`

---

### 7. Lead

**Table:** `leads`  
**File:** `apps/crm/src/leads/entities/lead.entity.ts`  
**Extends:** `TenantBaseEntity`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `number` | PK | |
| `firstName` | `string` | NOT NULL | |
| `lastName` | `string` | NOT NULL | |
| `email` | `string` | UNIQUE, NOT NULL | |
| `phone` | `string \| null` | — | |
| `jobTitle` | `string \| null` | — | |
| `companyName` | `string \| null` | — | Free-text company name (when no linked Company) |
| `companyId` | `number \| null` | FK → `companies.id` | Optional link to Company entity |
| `company` | `Company` | ManyToOne | |
| `status` | `LeadStatus` | ENUM, DEFAULT `new` | Workflow state |
| `source` | `LeadSource` | ENUM, DEFAULT `other` | How the lead was acquired |
| `score` | `number \| null` | INT, DEFAULT 0 | 0–100 lead quality score |
| `estimatedValue` | `number \| null` | DECIMAL(15,2) | Potential deal value |
| `notes` | `string \| null` | TEXT | |
| `website` | `string \| null` | — | |
| `address` | `string \| null` | — | |
| `city` | `string \| null` | — | |
| `state` | `string \| null` | — | |
| `country` | `string \| null` | — | |
| `zipCode` | `string \| null` | — | |
| `assignedToId` | `number \| null` | FK → `user.id` | Sales rep handling this lead |
| `ownerId` | `number \| null` | — | Owner for scope checks |
| `lastContactedAt` | `Date \| null` | TIMESTAMP | Auto-updated when status changes |
| *(TenantBaseEntity fields)* | | | `organizationId`, `createdById`, `updatedById`, `createdAt`, `updatedAt` |

**LeadStatus enum:**

| Value | Description |
|-------|-------------|
| `new` | Freshly created, no contact yet |
| `contacted` | Initial outreach made |
| `qualified` | Confirmed interest and fit |
| `unqualified` | Not a fit |
| `converted` | Converted to a deal |
| `lost` | Lost to competitor or disengaged |

**LeadSource enum:** `website`, `referral`, `social_media`, `email_campaign`, `cold_call`, `event`, `other`

---

### 8. Deal

**Table:** `deals`  
**File:** `apps/crm/src/deals/entities/deal.entity.ts`  
**Extends:** `TenantBaseEntity`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `number` | PK | |
| `title` | `string` | NOT NULL | |
| `value` | `number` | DECIMAL(15,2), NOT NULL | Deal value in currency |
| `stage` | `DealStage` | ENUM, DEFAULT `prospecting` | Current pipeline stage |
| `priority` | `DealPriority` | ENUM, DEFAULT `medium` | |
| `probability` | `number` | INT, DEFAULT 0 | Close probability 0–100% |
| `companyId` | `number \| null` | FK → `companies.id` | |
| `company` | `Company` | ManyToOne | |
| `contactId` | `number \| null` | FK → `contacts.id` | Primary contact for the deal |
| `contact` | `Contact` | ManyToOne | |
| `expectedCloseDate` | `Date \| null` | DATE | |
| `actualCloseDate` | `Date \| null` | DATE | Auto-set when stage → `closed_won` or `closed_lost` |
| `description` | `string \| null` | TEXT | |
| `notes` | `string \| null` | TEXT | |
| `assignedToId` | `number \| null` | — | Sales rep responsible |
| `ownerId` | `number \| null` | — | |
| `lostReason` | `string \| null` | — | Reason when `closed_lost` |
| `isActive` | `boolean` | DEFAULT true | `false` = soft-deleted |
| *(TenantBaseEntity fields)* | | | |

**DealStage enum:** `prospecting`, `qualification`, `proposal`, `negotiation`, `closed_won`, `closed_lost`

**DealPriority enum:** `low`, `medium`, `high`, `urgent`

---

### 9. Contact

**Table:** `contacts`  
**File:** `apps/crm/src/contacts/entities/contact.entity.ts`  
**Extends:** `TenantBaseEntity`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `number` | PK | |
| `firstName` | `string` | NOT NULL | |
| `lastName` | `string` | NOT NULL | |
| `email` | `string` | UNIQUE, NOT NULL | |
| `phone` | `string \| null` | — | |
| `mobile` | `string \| null` | — | |
| `jobTitle` | `string \| null` | — | |
| `department` | `string \| null` | — | Department within their company |
| `companyId` | `number \| null` | FK → `companies.id` | |
| `company` | `Company` | ManyToOne | |
| `linkedInUrl` | `string \| null` | — | |
| `twitterHandle` | `string \| null` | — | |
| `notes` | `string \| null` | TEXT | |
| `address` | `string \| null` | — | |
| `city` | `string \| null` | — | |
| `state` | `string \| null` | — | |
| `country` | `string \| null` | — | |
| `zipCode` | `string \| null` | — | |
| `birthday` | `Date \| null` | DATE | |
| `isPrimary` | `boolean` | DEFAULT true | Primary contact for their company |
| `isActive` | `boolean` | DEFAULT true | |
| `ownerId` | `number \| null` | — | |
| `lastContactedAt` | `Date \| null` | TIMESTAMP | |
| *(TenantBaseEntity fields)* | | | |

---

### 10. Company

**Table:** `companies`  
**File:** `apps/crm/src/company/entities/company.entity.ts`  
**Extends:** `TenantBaseEntity`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `number` | PK | |
| `name` | `string` | UNIQUE, NOT NULL | |
| `industry` | `string \| null` | — | |
| `website` | `string \| null` | — | |
| `email` | `string \| null` | — | Company email |
| `phone` | `string \| null` | — | |
| `address` | `string \| null` | TEXT | |
| `city` | `string \| null` | — | |
| `state` | `string \| null` | — | |
| `country` | `string \| null` | — | |
| `zipCode` | `string \| null` | — | |
| `employeeCount` | `number` | INT, DEFAULT 0 | |
| `annualRevenue` | `number \| null` | DECIMAL(15,2) | |
| `description` | `string \| null` | TEXT | |
| `isActive` | `boolean` | DEFAULT true | |
| `ownerId` | `number \| null` | — | |
| *(TenantBaseEntity fields)* | | | |

---

### 11. Activity

**Table:** `activities`  
**File:** `apps/crm/src/activities/entities/activity.entity.ts`  
**Extends:** `TenantBaseEntity`

Activities log every interaction (calls, emails, meetings, notes) against a related CRM record.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `number` | PK | |
| `type` | `ActivityType` | ENUM, NOT NULL | Kind of interaction |
| `subject` | `string` | NOT NULL | Title/summary |
| `description` | `string \| null` | TEXT | |
| `relationType` | `ActivityRelationType` | ENUM, NOT NULL | Which entity this is linked to |
| `relationId` | `number` | NOT NULL | ID of the linked entity |
| `duration` | `number \| null` | INT | Duration in minutes (for calls/meetings) |
| `activityDate` | `Date \| null` | TIMESTAMP | When the activity occurred/is scheduled |
| `isCompleted` | `boolean` | DEFAULT false | |
| `outcome` | `string \| null` | — | Result of the interaction |
| `userId` | `number \| null` | — | CRM user who logged the activity |
| `companyId` | `number \| null` | — | Company context |
| *(TenantBaseEntity fields)* | | | |

**ActivityType enum:** `call`, `email`, `meeting`, `note`, `task`, `deal`, `other`

**ActivityRelationType enum:** `lead`, `contact`, `company`, `deal`

---

### 12. Task

**Table:** `tasks`  
**File:** `apps/crm/src/tasks/entities/task.entity.ts`  
**Extends:** `TenantBaseEntity`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `number` | PK | |
| `title` | `string` | NOT NULL | |
| `description` | `string \| null` | TEXT | |
| `status` | `TaskStatus` | ENUM, DEFAULT `todo` | |
| `priority` | `TaskPriority` | ENUM, DEFAULT `medium` | |
| `dueDate` | `Date \| null` | TIMESTAMP | |
| `completedAt` | `Date \| null` | TIMESTAMP | Set by the complete action |
| `assignedToId` | `number \| null` | — | User assigned to complete this |
| `ownerId` | `number \| null` | — | |
| `relatedToType` | `string \| null` | — | `lead`, `contact`, `company`, or `deal` |
| `relatedToId` | `number \| null` | — | ID of related record |
| `companyId` | `number \| null` | — | Company context |
| `isReminder` | `boolean` | DEFAULT false | Whether this is a reminder task |
| `reminderDate` | `Date \| null` | TIMESTAMP | When to fire the reminder |
| *(TenantBaseEntity fields)* | | | |

**TaskStatus enum:** `todo`, `in_progress`, `completed`, `cancelled`

**TaskPriority enum:** `low`, `medium`, `high`, `urgent`

---

## Entity Relationship Summary

```
Organization ──< UserOrganizationRole >── Role ──< RolePermission
     │
     │ (organizationId)
     ▼
User ──< UserRole >── Role
  │
  │ (assignedToId / ownerId / createdById)
  ▼
Lead ──> Company
Deal ──> Company, Contact
Contact ──> Company
Activity (→ Lead | Contact | Company | Deal via relationType + relationId)
Task (→ Lead | Contact | Company | Deal via relatedToType + relatedToId)
```

---

## TypeORM Configuration

**File:** `apps/crm/src/typeorm.config.shared.ts`

- **Type:** `postgres`
- **Entities:** Auto-discovered via glob `/**/*.entity{.ts,.js}` relative to `__dirname`
- **Migrations:** Auto-discovered via glob `/migrations/*{.ts,.js}`
- **Synchronize:** `false` — always use explicit migrations
- **Environment detection:** Checks if `__dirname` contains `src` to decide whether to look for `.ts` or `.js` files (dev vs. prod)
