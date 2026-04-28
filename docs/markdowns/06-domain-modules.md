# 06 — Domain Modules

## TenantBaseService — Shared Tenancy Logic

**File:** `apps/crm/src/common/tenant-base.service.ts`

Every domain service extends `TenantBaseService`, which enforces organization isolation.

### Methods

#### `getUserOrganizationIds(user): Promise<number[]>`

Collects all org IDs accessible by the user from three sources:
1. `user.organizationId` (if set)
2. `user.userOrganizationRoles` (in-memory array, if hydrated)
3. DB query on `user_organization_roles` table filtered by `userId`

Returns a deduplicated array of org IDs.

#### `validateOrganizationAccess(user, contextOrgId?): Promise<number>`

1. Calls `getUserOrganizationIds(user)`
2. If no orgs found → throws `ForbiddenException('Organization context required')`
3. If `contextOrgId` provided → verifies it is in the allowed list; if not → throws `ForbiddenException('You do not have access to this organization')`
4. If `contextOrgId` not provided → returns the first allowed org ID as default

This is called at the top of every service method that touches tenant data.

---

## Leads Module

**Files:** `apps/crm/src/leads/`  
**Controller prefix:** `leads`

### LeadsService Business Logic

| Method | Key Behaviour |
|--------|--------------|
| `create()` | Sets `createdById = user.id`, `assignedToId = assignedToId ?? user.id`, `organizationId` from `validateOrganizationAccess()` |
| `findAll()` | Filters by org; additionally filters by `companyId` if `user.companyId` set; filters by `departmentId` or `teamId` subquery if those are set on the user |
| `findOne()` | Checks org, then optionally checks `user.companyId` vs `lead.companyId` — throws `ForbiddenException` on mismatch |
| `update()` | Calls `findOne()` first; if `status` is changing, auto-sets `lastContactedAt = new Date()` |
| `remove()` | Hard-deletes the record |
| `updateStatus()` | Sets status and `lastContactedAt = new Date()` |
| `getLeadsByStatus()` | Filters by `status` + org; applies company scope if `user.companyId` set |

### Relation Loaded

`findAll()` and `findOne()` both `leftJoinAndSelect` the `company` relation.

---

## Deals Module

**Files:** `apps/crm/src/deals/`  
**Controller prefix:** `deals`

### DealsService Business Logic

| Method | Key Behaviour |
|--------|--------------|
| `create()` | Sets `createdById`, `organizationId`, `assignedToId = assignedToId ?? user.id` |
| `findAll()` | Filters `isActive = true` + org; joins `company` and `contact` |
| `findOne()` | Finds by `id + organizationId`; throws `NotFoundException` if not found |
| `findByStage()` | Filters by `stage` + `isActive = true` + org |
| `update()` | Auto-sets `actualCloseDate = now` when stage transitions to `CLOSED_WON` or `CLOSED_LOST` (only if not already provided) |
| `remove()` | **Soft delete** — sets `isActive = false` and saves (does not hard-delete) |
| `getDealsPipeline()` | Fetches all active deals in org; groups by stage and computes `count`, `totalValue` per stage; returns totals + average deal value |

### Pipeline Response Structure

```typescript
{
  pipeline: [
    { stage: 'prospecting', count: 3, totalValue: 15000 },
    { stage: 'qualification', count: 2, totalValue: 8000 },
    // ...all stages
  ],
  totalDeals: 10,
  totalValue: 75000,
  avgDealValue: 7500,
}
```

### Soft Delete

`Deal.isActive` defaults to `true`. Calling `remove()` sets it to `false`. All `findAll()` and `findByStage()` queries filter `isActive = true`, so deleted deals are invisible but remain in the database.

---

## Contacts Module

**Files:** `apps/crm/src/contacts/`  
**Controller prefix:** `contacts`

### ContactsService Business Logic

- `create()`: Sets `createdById`, `organizationId`, optional `companyId` FK.
- `findAll()`: Can filter by `companyId` query param. Joins the `company` relation.
- `findOne()`: Validates org scope.
- `update()` / `remove()`: Standard CRUD with org scope check.

---

## Companies Module

**Files:** `apps/crm/src/company/`  
**Controller prefix:** `companies`

### CompanyService Business Logic

- `create()`: Org-scoped creation; sets `createdById`, `organizationId`.
- `findAll()`: Returns all companies for the org.
- `findOne()`: Org-scoped lookup with `NotFoundException` on miss.
- `update()` / `remove()`: Standard CRUD.

---

## Activities Module

**Files:** `apps/crm/src/activities/`  
**Controller prefix:** `activities`

### ActivitiesService Business Logic

| Method | Key Behaviour |
|--------|--------------|
| `create()` | Sets `createdById`, `organizationId`, `userId = user.id`. The `userId` field records the author; `relationType + relationId` records the target entity |
| `findAll()` | Orders by `activityDate DESC`, then `createdAt DESC` |
| `findByRelation()` | Filters by `relationType` + `relationId` + org (for activity timeline on a record) |
| `findByType()` | Filters by `ActivityType` enum value |
| `getUpcoming()` | Finds activities where `isCompleted = false` AND `activityDate >= now`, ordered by date ASC, limited by `limit` param (default 10) |
| `update()` / `remove()` | Standard with org scope; `remove()` hard-deletes |

### Relation Context

The `relationType` + `relationId` pair represents a polymorphic-style foreign key. There is no actual DB foreign key constraint — the application layer resolves the target entity based on the `relationType` string.

---

## Tasks Module

**Files:** `apps/crm/src/tasks/`  
**Controller prefix:** `tasks`

### TasksService Business Logic

| Method | Key Behaviour |
|--------|--------------|
| `create()` | Sets `createdById`, `organizationId`, `assignedToId = assignedToId ?? user.id` |
| `findAll()` | Orders by `dueDate ASC`, then `priority DESC` (urgent first) |
| `findMyTasks()` | Filters `assignedToId = user.id` + `status != COMPLETED` + org |
| `findOverdue()` | Filters `dueDate < now` + `status != COMPLETED` + org |
| `completeTask()` | Sets `status = COMPLETED`, `completedAt = new Date()` |
| `update()` | Standard `Object.assign` + save |
| `remove()` | Hard-deletes |

### Task Lifecycle

```
todo → in_progress → completed
                   ↘ cancelled
```

`PATCH /tasks/:id/complete` is a dedicated shortcut that sets both `status = COMPLETED` and `completedAt`.

---

## Module Dependencies

Each domain module registers the following providers:

```
[ModuleName]Module
  imports:
    TypeOrmModule.forFeature([Entity, UserOrganizationRole])
  controllers:
    [ModuleName]Controller
  providers:
    [ModuleName]Service
```

All modules are imported by `AppModule` in `apps/crm/src/app.module.ts`.

---

## Cross-Module Data Relationships

| From | To | Via |
|------|----|-----|
| Lead | Company | `lead.companyId → company.id` |
| Deal | Company | `deal.companyId → company.id` |
| Deal | Contact | `deal.contactId → contact.id` |
| Contact | Company | `contact.companyId → company.id` |
| Activity | Any | `activity.relationType + activity.relationId` (polymorphic) |
| Task | Any | `task.relatedToType + task.relatedToId` (polymorphic) |
| All entities | Organization | `[entity].organizationId → organization.id` |
| All entities | User (creator) | `[entity].createdById → user.id` |
| Lead, Deal, Task | User (assignee) | `[entity].assignedToId → user.id` |
