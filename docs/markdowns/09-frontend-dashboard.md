# 09 — Frontend Dashboard

## Technology Stack

| Technology | Version | Role |
|------------|---------|------|
| Next.js | 16 (App Router) | React framework |
| React | 19 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Styling |
| TanStack React Query | v5 | Server state, caching |
| Lucide React | latest | Icons |

---

## Project Structure

```
dashboard/
├── app/                    ← Next.js App Router pages
│   ├── layout.tsx          ← Root layout (server component)
│   ├── layout-client.tsx   ← Client layout wrapper with providers
│   ├── globals.css
│   ├── page.tsx            ← Dashboard home
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── companies/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── leads/
│   ├── contacts/
│   ├── deals/
│   ├── activities/
│   ├── tasks/
│   ├── organizations/
│   ├── users/
│   ├── roles/
│   └── settings/
├── components/             ← Shared UI components
├── lib/                    ← API client, hooks, permissions
├── hooks/                  ← Custom hooks
└── middleware.ts           ← Next.js middleware (auth guard)
```

---

## Layout Architecture

### RootLayout (`app/layout.tsx`)

Server component. Sets HTML lang, applies Google fonts (Geist + Geist Mono), wraps everything in `RootLayoutClient`.

### RootLayoutClient (`app/layout-client.tsx`)

Client component. Renders the full provider tree:

```
QueryProvider (TanStack React Query)
  └── PermissionsProvider (permissions context)
        ├── Sidebar (hidden on /login, /register)
        ├── ManagementNavbar (hidden on auth pages)
        └── {children}
```

On mount (for authenticated pages):
- Fetches `GET /auth/me` to load user + organizations
- Stores orgs in `useOrganization` state

Layout behavior:
- Auth pages (`/login`, `/register`): full-screen, no sidebar
- All other pages: `ml-64` margin left (sidebar width), padded content area

---

## Authentication Flow (Frontend)

### Login

1. User submits credentials to `POST /api/auth/login`
2. On success: stores `token` in `localStorage['token']` + `document.cookie`
3. Stores user object in `localStorage['user']`
4. Redirects to `/`

### Protected Routes

**Middleware** (`dashboard/middleware.ts`) runs on every request:
- Reads `token` from **cookies** (`request.cookies.get('token')`)
- Protected routes: `/`, `/companies`, `/leads`, `/contacts`, `/deals`, `/activities`, `/tasks`
- If no cookie token → `NextResponse.redirect('/login')`
- Public routes: `/login`, `/register` — always allowed

> Note: The API client reads token from `localStorage`, but the middleware reads from cookies. Login must set both.

### Logout

```typescript
localStorage.removeItem('token');
localStorage.removeItem('user');
document.cookie = 'token=; path=/; max-age=0';
router.push('/login');
```

---

## API Client

**File:** `dashboard/lib/api-client.ts`

### `createFetchWithAuth(token?)`

Returns an async fetch wrapper that automatically:
1. Sets `Content-Type: application/json`
2. Reads `token` from `localStorage['token']` (if no token provided)
3. Reads `currentOrgId` from `localStorage['currentOrgId']`
4. Attaches headers: `Authorization: Bearer <token>`, `x-crm-org-id: <orgId>`
5. Prepends `NEXT_PUBLIC_API_URL` (default: `http://localhost:11177/api`) to the URL path

### Error Handling

```
response.ok === false
  → throws Error with:
      .data    = parsed JSON body
      .errors  = data.errors || { general: data.message }
```

### Empty Response Handling

When `status === 204` or `content-length === '0'` → returns `null` instead of trying to parse JSON.

### Singleton

```typescript
export const apiClient = createFetchWithAuth(); // pre-bound instance
```

---

## Permissions in the Frontend

### PermissionsProvider (`lib/PermissionsProvider.tsx`)

React context that wraps the entire app. On mount:

1. Checks `localStorage['token']` — skips fetch if missing
2. Calls `GET /auth/me` to get user + organizations array
3. Determines current org: reads `localStorage['currentOrgId']`, validates it is in the orgs list; falls back to first org
4. Sets `localStorage['currentOrgId']`
5. Calls `GET /auth/permissions?organizationId={currentOrgId}`
6. Stores `permissions: UserPermission[]` in context state

Context shape:
```typescript
{
  permissions: UserPermission[],
  organizationId?: number,
  isLoading: boolean,
  error: Error | null,
  refetch: () => Promise<void>,
}
```

### usePermissions() (`lib/usePermissionCheck.ts`)

Simple hook returning `{ permissions, isLoading, error }` from `PermissionsContext`.  
Used by data hooks to delay queries until permissions are loaded.

### usePermissionCheck() (`lib/usePermissionCheck.ts`)

Full convenience hook:

| Method | Signature | Description |
|--------|-----------|-------------|
| `can` | `(permission: string, scope?) → boolean` | Single permission check |
| `canRead` | `(resource: string, scope?) → boolean` | `{resource}:read` |
| `canCreate` | `(resource: string, scope?) → boolean` | `{resource}:create` |
| `canUpdate` | `(resource: string, scope?) → boolean` | `{resource}:update` |
| `canDelete` | `(resource: string, scope?) → boolean` | `{resource}:delete` |
| `canAll` | `(perms: string[], scope?) → boolean` | All must pass |
| `canAny` | `(perms: string[], scope?) → boolean` | Any must pass |
| `checkRequirement` | `(req: PermissionRequirement, scope?) → boolean` | Full requirement |
| `permissions` | `UserPermission[]` | Raw permissions array |

### useUserPermissions() (`lib/useUserPermissions.ts`)

React Query hook that fetches permissions from `/auth/permissions`:
- `staleTime: 5 minutes`
- `gcTime: 10 minutes`
- Returns `{ userId: 0, permissions: [] }` on error (soft fail)

### useRefreshPermissions()

Returns `refetch` from `PermissionsContext` — call after login to reload permissions.

### PermissionGuard component (`components/permission-guard.tsx`)

Renders children only if the user has the required permission. Used throughout pages to conditionally show buttons, forms, and actions.

---

## Data Hooks (`lib/hooks.ts`)

All data hooks use TanStack React Query. They gate data fetching on permissions being loaded first:

```typescript
const { isLoading: permissionsLoading } = usePermissions();
return useQuery({
  queryKey: ['leads'],
  queryFn: () => fetcher('/leads'),
  enabled: !permissionsLoading,  // ← gate
});
```

### Available Hooks

| Hook | Query Key | Endpoint |
|------|-----------|----------|
| `useCompanies()` | `['companies']` | `GET /companies` |
| `useCompany(id)` | `['companies', id]` | `GET /companies/:id` |
| `useCreateCompany()` | mutation | `POST /companies` |
| `useLeads()` | `['leads']` | `GET /leads` |
| `useLead(id)` | `['leads', id]` | `GET /leads/:id` |
| `useCreateLead()` | mutation | `POST /leads` |
| `useContacts()` | `['contacts']` | `GET /contacts` |
| `useContact(id)` | `['contacts', id]` | `GET /contacts/:id` |
| `useDeals()` | `['deals']` | `GET /deals` |
| `useDeal(id)` | `['deals', id]` | `GET /deals/:id` |
| `useDealsPipeline()` | `['deals', 'pipeline']` | `GET /deals/pipeline` |
| `useActivities()` | `['activities']` | `GET /activities` |
| `useActivity(id)` | `['activities', id]` | `GET /activities/:id` |
| `useTasks()` | `['tasks']` | `GET /tasks` |
| `useTask(id)` | `['tasks', id]` | `GET /tasks/:id` |
| `useMyTasks()` | `['tasks', 'my-tasks']` | `GET /tasks/my-tasks` |
| `useOverdueTasks()` | `['tasks', 'overdue']` | `GET /tasks/overdue` |

All `create*` mutations call `queryClient.invalidateQueries` on success to refresh the list.

---

## Shared Components (`components/`)

| Component | File | Description |
|-----------|------|-------------|
| `Button` | `button.tsx` | Styled button with variants |
| `Input` | `input.tsx` | Form input with label support |
| `Textarea` | `textarea.tsx` | Multi-line text input |
| `Select` | `select.tsx` | Dropdown select |
| `Modal` | `modal.tsx` | Dialog overlay |
| `Table` | `table.tsx` | Data table layout |
| `Form` | `form.tsx` | Form wrapper |
| `Details` | `details.tsx` | Record detail view |
| `Header` | `header.tsx` | Page header |
| `StatCard` | `stat-card.tsx` | KPI metric card |
| `Sidebar` | `sidebar.tsx` | Left navigation |
| `ManagementNavbar` | `management-navbar.tsx` | Top navigation bar |
| `OrganizationSwitcher` | `organization-switcher.tsx` | Multi-org switcher dropdown |
| `PermissionGuard` | `permission-guard.tsx` | Conditional render by permission |

---

## Organization Switcher

**Hook:** `hooks/use-organization.ts`  
**Component:** `components/organization-switcher.tsx`

Stores:
- `organizations: Organization[]` — all orgs the user belongs to
- `currentOrgId: number | null` — persisted in `localStorage['currentOrgId']`

On org change:
1. Updates `localStorage['currentOrgId']`
2. API client picks up new org on next request
3. `PermissionsProvider.refetch()` is called to reload permissions for the new org

---

## Sidebar Navigation

| Item | Route | Icon |
|------|-------|------|
| Dashboard | `/` | LayoutDashboard |
| Companies | `/companies` | Building2 |
| Leads | `/leads` | Users |
| Contacts | `/contacts` | UserCircle |
| Deals | `/deals` | Handshake |
| Activities | `/activities` | Activity |
| Tasks | `/tasks` | ListTodo |
| Management | `/organizations` | Settings |

Logout button clears localStorage + cookie and redirects to `/login`.

---

## Management Pages

| Route | Purpose |
|-------|---------|
| `/organizations` | List/manage organizations |
| `/organizations/new` | Create organization |
| `/organizations/[id]` | Organization detail |
| `/users` | User management |
| `/roles` | Role management |
| `/roles/[id]` | Role detail + permission assignment |
| `/roles/permissions-config.ts` | Frontend permission config |
| `/settings` | App settings |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:11177/api` | CRM backend URL |
