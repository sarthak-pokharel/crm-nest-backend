# 05 — API Reference

## Global Settings

| Setting | Value |
|---------|-------|
| Base URL | `http://localhost:3000` |
| API prefix | `/api` |
| Auth scheme | Bearer token in `Authorization` header |
| Org header | `x-crm-org-id` (integer, required for org-scoped operations) |
| Content-Type | `application/json` |

All endpoints (except `POST /auth/login` and `POST /auth/register`) require a valid JWT.

---

## Authentication

### POST /api/auth/register

Create a new user account.

**Body:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `username` | string | ✓ | Unique |
| `email` | string | ✓ | Valid email, unique |
| `password` | string | ✓ | Min 8 chars |
| `firstName` | string | ✓ | |
| `lastName` | string | ✓ | |
| `phone` | string | | Optional |

**Response:** `201` — user object + JWT token  
**Side effect:** Publishes `UserCreatedEvent` → triggers welcome email via email-service

---

### POST /api/auth/login

Authenticate with credentials.

**Body:**
| Field | Type | Required |
|-------|------|----------|
| `email` | string | ✓ |
| `password` | string | ✓ |

**Response:** `200` — `{ access_token: string, user: UserObject }`  
**Error:** `401` if credentials invalid

---

### GET /api/auth/me

Returns the current user's profile.

**Headers:** `Authorization: Bearer <token>`  
**Response:** `200` — full user entity

---

### GET /api/auth/permissions

Returns the current user's resolved permissions for a given organization.

**Query Params:**
| Param | Type | Required |
|-------|------|----------|
| `organizationId` | number | Optional — if provided, merges org-specific permissions |

**Response:**
```json
{
  "userId": 1,
  "organizationId": 2,
  "permissions": [
    { "permission": "lead:read", "scope": "global" },
    { "permission": "deal:read", "scope": "company" }
  ]
}
```

---

### GET /api/auth/users

List all users in the system.

**Permission:** `user:read`  
**Response:** `200` — array of user objects

---

## Organizations

**Base path:** `/api/organizations`  
**Guards:** `JwtAuthGuard`, `PermissionGuard`

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `POST` | `/organizations` | `organization:create` | Create new organization |
| `GET` | `/organizations` | `organization:read` | List all organizations |
| `GET` | `/organizations/:id` | `Owner \| organization:read` | Get organization by ID |
| `GET` | `/organizations/:id/stats` | `Owner \| organization:read` | Organization statistics |
| `GET` | `/organizations/slug/:slug` | `Owner \| organization:read` | Find by URL slug |
| `PUT` | `/organizations/:id` | `Owner \| organization:update` | Update organization |
| `DELETE` | `/organizations/:id` | `Owner \| organization:delete` | Delete organization |

**CreateOrganizationDto:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✓ | Max 255 chars |
| `description` | string | | Optional |
| `website` | string | | URL format |
| `email` | string | | Email format |
| `phone` | string | | Max 50 chars |
| `address` | string | | |
| `city` | string | | Max 100 |
| `state` | string | | Max 100 |
| `country` | string | | Max 100 |
| `zipCode` | string | | Max 20 |
| `isActive` | boolean | | Defaults to `true` |

**Stats response shape:**
```json
{
  "memberCount": 5,
  "roleCount": 3,
  "organization": { ...organizationObject }
}
```

---

## Leads

**Base path:** `/api/leads`

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `POST` | `/leads` | `lead:create` | Create new lead |
| `GET` | `/leads` | `lead:read` | List leads (filterable) |
| `GET` | `/leads/:id` | `lead:read` | Get lead by ID |
| `PATCH` | `/leads/:id` | `Owner \| lead:update` | Update lead fields |
| `PATCH` | `/leads/:id/status` | `Owner \| lead:update` | Update lead status only |
| `DELETE` | `/leads/:id` | `Owner \| lead:delete` | Delete lead |

**Query Params (GET /leads):**
| Param | Type | Notes |
|-------|------|-------|
| `status` | `LeadStatus` enum | Filter by status |

**CreateLeadDto:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `firstName` | string | ✓ | Max 100 |
| `lastName` | string | ✓ | Max 100 |
| `email` | string | ✓ | Valid email |
| `phone` | string | | Max 50 |
| `company` | string | | Max 255 |
| `jobTitle` | string | | Max 100 |
| `source` | `LeadSource` | | Enum |
| `status` | `LeadStatus` | | Enum, default `NEW` |
| `value` | number | | Potential value |
| `notes` | string | | |
| `address` | string | | |
| `city` | string | | Max 100 |
| `state` | string | | Max 100 |
| `country` | string | | Max 100 |
| `zipCode` | string | | Max 20 |
| `assignedToId` | number | | User ID |

**LeadStatus enum:** `new`, `contacted`, `qualified`, `unqualified`, `converted`  
**LeadSource enum:** `website`, `referral`, `social_media`, `email_campaign`, `cold_call`, `event`, `other`

---

## Deals

**Base path:** `/api/deals`

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `POST` | `/deals` | `deal:create` | Create new deal |
| `GET` | `/deals` | `deal:read` | List deals (filterable) |
| `GET` | `/deals/pipeline` | `deal:read` | Deals grouped by stage |
| `GET` | `/deals/:id` | `deal:read` | Get deal by ID |
| `PATCH` | `/deals/:id` | `Owner \| deal:update` | Update deal fields |
| `DELETE` | `/deals/:id` | `Owner \| deal:delete` | Delete deal |

**Query Params (GET /deals):**
| Param | Type | Notes |
|-------|------|-------|
| `stage` | `DealStage` enum | Filter by pipeline stage |

**CreateDealDto:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | ✓ | Max 255 |
| `value` | number | ✓ | Min 0 |
| `stage` | `DealStage` | | Enum |
| `priority` | `DealPriority` | | Enum |
| `probability` | number | | 0–100 |
| `companyId` | number | | FK |
| `contactId` | number | | FK |
| `expectedCloseDate` | string (ISO date) | | |
| `description` | string | | |
| `notes` | string | | |
| `assignedToId` | number | | User ID |

**DealStage enum:** `prospecting`, `qualification`, `proposal`, `negotiation`, `closed_won`, `closed_lost`  
**DealPriority enum:** `low`, `medium`, `high`, `critical`

**Pipeline response (GET /deals/pipeline):**
```json
{
  "prospecting": [...deals],
  "qualification": [...deals],
  "proposal": [...deals],
  "negotiation": [...deals],
  "closed_won": [...deals],
  "closed_lost": [...deals]
}
```

---

## Contacts

**Base path:** `/api/contacts`

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `POST` | `/contacts` | `contact:create` | Create new contact |
| `GET` | `/contacts` | `contact:read` | List contacts (filterable) |
| `GET` | `/contacts/:id` | `contact:read` | Get contact by ID |
| `PATCH` | `/contacts/:id` | `Owner \| contact:update` | Update contact |
| `DELETE` | `/contacts/:id` | `Owner \| contact:delete` | Delete contact |

**Query Params (GET /contacts):**
| Param | Type | Notes |
|-------|------|-------|
| `companyId` | number | Filter by linked company |

**CreateContactDto:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `firstName` | string | ✓ | Max 100 |
| `lastName` | string | ✓ | Max 100 |
| `email` | string | ✓ | Valid email |
| `phone` | string | | Max 50 |
| `mobile` | string | | Max 50 |
| `jobTitle` | string | | Max 100 |
| `department` | string | | Max 100 |
| `companyId` | number | | FK |
| `linkedInUrl` | string | | URL |
| `twitterHandle` | string | | Max 50 |
| `notes` | string | | |
| `address` | string | | |
| `city` | string | | Max 100 |
| `state` | string | | Max 100 |
| `country` | string | | Max 100 |
| `zipCode` | string | | Max 20 |
| `birthday` | string (ISO date) | | |

---

## Companies

**Base path:** `/api/companies`

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `POST` | `/companies` | `company:create` | Create new company |
| `GET` | `/companies` | `company:read` | List all companies |
| `GET` | `/companies/:id` | `company:read` | Get company by ID |
| `PATCH` | `/companies/:id` | `Owner \| company:update` | Update company |
| `DELETE` | `/companies/:id` | `Owner \| company:delete` | Delete company |

**CreateCompanyDto:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✓ | Max 255 |
| `industry` | string | | Max 100 |
| `website` | string | | URL format |
| `email` | string | | Email format |
| `phone` | string | | Max 50 |
| `address` | string | | |
| `city` | string | | Max 100 |
| `state` | string | | Max 100 |
| `country` | string | | Max 100 |
| `zipCode` | string | | Max 20 |
| `employeeCount` | number | | |
| `annualRevenue` | number | | |
| `description` | string | | |
| `isActive` | boolean | | |

---

## Activities

**Base path:** `/api/activities`

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `POST` | `/activities` | `activity:create` | Log new activity |
| `GET` | `/activities` | `activity:read` | List activities (filterable) |
| `GET` | `/activities/upcoming` | `activity:read` | Upcoming activities |
| `GET` | `/activities/:id` | `activity:read` | Get activity by ID |
| `PATCH` | `/activities/:id` | `Owner \| activity:update` | Update activity |
| `DELETE` | `/activities/:id` | `Owner \| activity:delete` | Delete activity |

**Query Params (GET /activities):**
| Param | Type | Notes |
|-------|------|-------|
| `type` | `ActivityType` enum | Filter by type |
| `relationType` | `ActivityRelationType` enum | Filter by relation type |
| `relationId` | number | Filter by related entity ID |

**Query Params (GET /activities/upcoming):**
| Param | Type | Notes |
|-------|------|-------|
| `limit` | number | Max results, default 10 |

**CreateActivityDto:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `type` | `ActivityType` | ✓ | Enum |
| `subject` | string | ✓ | Max 255 |
| `description` | string | | |
| `relationType` | `ActivityRelationType` | ✓ | Enum |
| `relationId` | number | ✓ | ID of related entity |
| `duration` | number | | Minutes |
| `activityDate` | string (ISO date) | | |
| `isCompleted` | boolean | | Default `false` |
| `outcome` | string | | Max 255 |

**ActivityType enum:** `call`, `email`, `meeting`, `note`, `task`  
**ActivityRelationType enum:** `lead`, `deal`, `contact`, `company`

---

## Tasks

**Base path:** `/api/tasks`

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `POST` | `/tasks` | `task:create` | Create new task |
| `GET` | `/tasks` | `task:read` | List tasks (filterable) |
| `GET` | `/tasks/my-tasks` | `task:read` | Tasks assigned to current user |
| `GET` | `/tasks/overdue` | `task:read` | Tasks past due date |
| `GET` | `/tasks/:id` | `task:read` | Get task by ID |
| `PATCH` | `/tasks/:id` | `Owner \| task:update` | Update task |
| `PATCH` | `/tasks/:id/complete` | `Owner \| task:complete` | Mark task completed |
| `DELETE` | `/tasks/:id` | `Owner \| task:delete` | Delete task |

**Query Params (GET /tasks):**
| Param | Type | Notes |
|-------|------|-------|
| `status` | `TaskStatus` enum | Filter by status |

**CreateTaskDto:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | ✓ | Max 255 |
| `description` | string | | |
| `status` | `TaskStatus` | | Enum |
| `priority` | `TaskPriority` | | Enum |
| `dueDate` | string (ISO date) | | |
| `assignedToId` | number | | User ID |
| `relatedToType` | string | | Entity type name |
| `relatedToId` | number | | Entity ID |
| `isReminder` | boolean | | |
| `reminderDate` | string (ISO date) | | |

**TaskStatus enum:** `todo`, `in_progress`, `completed`, `cancelled`  
**TaskPriority enum:** `low`, `medium`, `high`, `urgent`

---

## Roles

**Base path:** `/api/roles`  
**Guards:** `JwtAuthGuard`, `PermissionGuard`

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| `GET` | `/roles` | `role:read` | List all roles |
| `GET` | `/roles/:id` | `role:read` | Get role by ID |
| `POST` | `/roles` | `role:create` | Create new role |
| `PUT` | `/roles/:id` | `role:update` | Update role |
| `GET` | `/roles/:id/permissions` | `role:read` | Get role's permissions |
| `PUT` | `/roles/:id/permissions` | `role:update` | Replace role permissions (full replace) |

**CreateRoleDto:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✓ | Max 100 |
| `description` | string | | Max 255 |
| `isActive` | boolean | | Default `true` |

---

## Error Response Format

All API errors follow NestJS default format:

```json
{
  "statusCode": 403,
  "message": "Insufficient permissions",
  "error": "Forbidden"
}
```

Validation errors return `400` with `message` as an array of constraint strings:

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password must be longer than 8 characters"],
  "error": "Bad Request"
}
```

---

## Multi-Tenancy Headers

When working with org-scoped resources, pass the organization ID header on every request:

```
x-crm-org-id: 2
```

This header is used by:
- `AuthService.validateOrganizationAccess()` — verifies membership
- Services at the query level — filters records by `organizationId`
- The `OrganizationInterceptor` — loads organization onto `request.resource` for `Owner` checks

Without this header, operations fall back to the user's global context (no org filtering).
