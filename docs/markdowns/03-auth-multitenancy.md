# 03 — Authentication & Multi-Tenancy

## Authentication Strategy

The CRM uses **JWT (JSON Web Tokens)** via Passport.js. Tokens are stateless — no server-side sessions.

---

## Registration Flow

**Endpoint:** `POST /api/auth/register`  
**DTO:** `CreateUserDto`

```
Client sends { firstName, lastName, email, password }
         │
         ▼
AuthService.register()
  1. Hash password with bcrypt (10 salt rounds)
  2. Call UserService.create({ ...data, password: hashedPassword })
         │
         ▼
UserService.create()
  1. userRepository.create(data)      — build entity
  2. userRepository.saveUser(user)    — persist to DB
  3. publisher.mergeObjectContext(savedUser) — attach CQRS event publisher
  4. userModel.register()             — applies UserCreatedEvent to aggregate
  5. userModel.commit()               — publishes event to EventBus
         │
         ▼
UserCreatedHandler (in emails module)
  → Dispatches SendEmailCommand
  → Email service receives over TCP → queues welcome email → sends via SMTP
         │
         ▼
Returns { error: false, message: 'Registration successful', userId: number }
```

**Password hashing:** `bcrypt.hash(password, 10)` — 10 salt rounds.

---

## Login Flow

**Endpoint:** `POST /api/auth/login`  
**DTO:** `LoginUserDto`

```
Client sends { email, password }
         │
         ▼
AuthService.login()
  1. UserService.findByEmail(email)   — look up user
  2. bcrypt.compare(password, user.password) — verify hash
  3. If invalid → throw UnauthorizedException('Invalid credentials')
  4. Build JwtPayload: { id: user.id, email: user.email }
  5. jwtService.sign(payload) — sign with JWT_SECRET, expires in JWT_EXPIRES_IN seconds
         │
         ▼
Returns { message, userId, error: false, accessToken: string }
```

---

## JWT Verification Flow

Every protected endpoint uses `@UseGuards(JwtAuthGuard)`.

```
Request arrives with Authorization: Bearer <token>
         │
         ▼
JwtAuthGuard (Passport JWT strategy)
  1. ExtractJwt.fromAuthHeaderAsBearerToken() — extract token
  2. Verify signature with JWT_SECRET
  3. Decode payload: { id, email }
  4. JwtStrategy.validate(payload) calls AuthService.validateUserByJwtPayload(payload)
  5. UserService.findById(payload.id) — fetch full User entity from DB
  6. Attach user to request.user
         │
         ▼
@GetUser() decorator reads request.user and injects into controller method
```

**JWT Configuration** (in `AuthModule`):

```typescript
JwtModule.registerAsync({
  secret: configService.get('JWT_SECRET', 'fallbackSecret'),
  signOptions: { expiresIn: Number(configService.get('JWT_EXPIRES_IN', '3600')) },
})
```

> Warning: The `fallbackSecret` default is for development only. Always set `JWT_SECRET` in production.

---

## Key Auth Files

| File | Purpose |
|------|---------|
| `apps/crm/src/auth/auth.controller.ts` | `POST /login`, `POST /register`, `GET /me`, `GET /permissions`, `GET /users` |
| `apps/crm/src/auth/auth.service.ts` | Login, register, `me()`, `getPermissions()`, `getAllUsers()` |
| `apps/crm/src/auth/auth.module.ts` | Wires `UserModule`, `JwtModule`, `PassportModule`, `JwtStrategy` |
| `apps/crm/src/auth/jwt/jwt.strategy.ts` | Passport strategy — extracts and validates JWT |
| `apps/crm/src/auth/jwt/jwt.guard.ts` | `JwtAuthGuard` — applies strategy as NestJS guard |
| `apps/crm/src/auth/user/user.decorator.ts` | `@GetUser()` param decorator — injects `request.user` |
| `apps/crm/src/auth/user/user.entity.ts` | `User` entity extending `AggregateRoot` |
| `apps/crm/src/auth/user/user.service.ts` | `create()`, `update()`, `remove()`, `findByEmail()`, `findById()` |
| `apps/crm/src/auth/user/user.dto.ts` | `CreateUserDto`, `UpdateUserDto`, `LoginUserDto` |

---

## DTOs

### CreateUserDto

| Field | Validator | Notes |
|-------|-----------|-------|
| `firstName` | `@IsString()` | Required |
| `lastName` | `@IsString()` | Required |
| `email` | `@IsEmail()` | Required |
| `password` | `@IsString()`, `@MinLength(6)` | Required, min 6 chars |
| `isActive` | `@IsBoolean()`, `@IsOptional()` | Optional |

### LoginUserDto

| Field | Validator |
|-------|-----------|
| `email` | `@IsEmail()` |
| `password` | `@IsString()`, `@MinLength(6)` |

### UpdateUserDto

All fields optional. Same fields as `CreateUserDto` but all marked `@IsOptional()`.

---

## GET /api/auth/me

Returns the authenticated user's profile plus all their organizations and roles.

```typescript
// Response shape
{
  id: number,
  firstName: string,
  lastName: string,
  email: string,
  isActive: boolean,
  organizationId: number | null,
  companyId: number | null,
  departmentId: number | null,
  teamId: number | null,
  organizations: Array<{
    id: number,
    name: string,
    slug: string,
    logo: string | null,
    roleName: string
  }>
}
```

The organizations array is fetched via a raw SQL join across `user_organization_roles`, `organizations`, and `roles`, filtering for `isActive = true` organizations.

---

## GET /api/auth/permissions

Returns the authenticated user's full permission set, optionally scoped to an organization.

**Query param:** `?organizationId=<number>` (optional)

```typescript
// Response shape
{
  userId: number,
  organizationId: number | undefined,
  permissions: Array<{
    permission: string,   // e.g., "lead:read"
    scope: string        // e.g., "global"
  }>
}
```

**Resolution logic:**
1. Fetch global permissions from `user_roles` → `role_permissions`
2. If `organizationId` provided, also fetch from `user_organization_roles` → `role_permissions`
3. Deduplicate — for the same `permissionKey`, keep the **broadest** scope using scope order: `['global', 'company', 'department', 'team', 'self', 'owner']`

---

## Multi-Tenancy

### Concept

A **User** can belong to many **Organizations**. Each organization is a fully isolated tenant — users only see data belonging to their active organization.

### How Tenant Context Is Established Per Request

1. The frontend stores the active organization ID in `localStorage['currentOrgId']`.
2. Every API request includes `x-crm-org-id: <number>` header (injected by `api-client.ts`).
3. Controllers read this header:
   ```typescript
   @Headers('x-crm-org-id') orgIdHeader?: string
   const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
   ```
4. Services call `TenantBaseService.validateOrganizationAccess(user, organizationId)`.

### TenantBaseService.validateOrganizationAccess()

```typescript
async validateOrganizationAccess(user: User, contextOrgId?: number): Promise<number>
```

1. Calls `getUserOrganizationIds(user)`:
   - Collects `user.organizationId` if set
   - Collects all `userOrganizationRoles` entries for the user from DB
   - Returns a `Set<number>` of all org IDs the user belongs to
2. If `allowedOrgIds` is empty → throws `ForbiddenException('Organization context required')`
3. If `contextOrgId` is provided and NOT in `allowedOrgIds` → throws `ForbiddenException('You do not have access to this organization')`
4. Returns `contextOrgId` if valid, or `allowedOrgIds[0]` (first org) as fallback

### Data Isolation

All queries in domain services include `.where('entity.organizationId = :organizationId', { organizationId })`. A user from Org A can never read Org B's data.

---

## Organization Management

**Controller:** `apps/crm/src/auth/organization/organization.controller.ts`  
**Service:** `apps/crm/src/auth/organization/organization.service.ts`

All organization endpoints require `JwtAuthGuard` + `PermissionGuard` + `OrganizationInterceptor`.

### OrganizationInterceptor

**File:** `apps/crm/src/auth/organization/organization.interceptor.ts`

Loads the organization resource from the DB and attaches it to `request.resource` before the controller handler runs. This enables the `PermissionGuard` to check `resource.createdById === user.id` for `Owner` scope checks.

### Organization DTOs

**CreateOrganizationDto:**

| Field | Validator | Notes |
|-------|-----------|-------|
| `name` | `@IsString()` | Required |
| `description` | `@IsString()`, `@IsOptional()` | |
| `slug` | `@IsString()`, `@IsOptional()` | Auto-generated from name if not provided |
| `logo` | `@IsString()`, `@IsOptional()` | URL |
| `website` | `@IsString()`, `@IsOptional()` | |
| `settings` | `@IsObject()`, `@IsOptional()` | Free-form JSON |

**UpdateOrganizationDto:** All fields optional, same shape + `isActive?: boolean`.

### Slug Generation

```typescript
private generateSlug(text: string): string {
  return text.toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}
```

Applied automatically at creation if `slug` not provided in the DTO.

### getOrganizationStats()

Returns aggregate data for an organization:
- Member count (from `user_organization_roles`)
- Role count (distinct roles in use)
- Other metadata

---

## Frontend Auth Flow

1. User submits login form → `POST /api/auth/login`
2. Response `accessToken` stored in `localStorage['token']`
3. Also stored in cookie `token` (Next.js middleware reads cookie for SSR route protection)
4. `GET /api/auth/me` fetches user profile + organizations
5. First organization ID stored in `localStorage['currentOrgId']`
6. User can switch organizations via `OrganizationSwitcher` component (updates `currentOrgId`)
7. All subsequent API calls include `Authorization: Bearer <token>` + `x-crm-org-id: <orgId>`

### Route Protection (Middleware)

**File:** `dashboard/middleware.ts`

Protected routes: `/`, `/companies`, `/leads`, `/contacts`, `/deals`, `/activities`, `/tasks`

- Reads `token` cookie
- If token absent on a protected route → redirect to `/login`
- Login and register pages are always public
