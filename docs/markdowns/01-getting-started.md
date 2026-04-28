# 01 — Getting Started

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | ≥ 20 | LTS recommended |
| pnpm | ≥ 9 | `npm install -g pnpm` |
| PostgreSQL | ≥ 14 | Running locally or remote |
| Redis | ≥ 7 | Required for BullMQ email queue |
| SMTP credentials | — | Mailtrap for dev, any SMTP for prod |

---

## 1. Clone & Install

```bash
git clone <repo-url> crm-nest-backend
cd crm-nest-backend
pnpm install
```

---

## 2. Environment Variables

### Backend — create `.env` in the root `crm-nest-backend/` directory

```env
# ── Database ──────────────────────────────────────────
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=crm

# ── JWT ───────────────────────────────────────────────
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRES_IN=3600          # seconds (1 hour)

# ── App ───────────────────────────────────────────────
PORT=3000                    # CRM API port

# ── SMTP (Email Service) ──────────────────────────────
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_pass
SMTP_FROM="My CRM <noreply@myapp.com>"

# ── Email Microservice ────────────────────────────────
EMAIL_SERVICE_HOST=127.0.0.1
EMAIL_SERVICE_PORT=7771

# ── Messaging Service (future) ────────────────────────
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_D1_DATABASE_ID=
CLOUDFLARE_API_TOKEN=
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/webhooks/telegram
```

### Frontend — create `.env.local` in `dashboard/`

```env
NEXT_PUBLIC_API_URL=http://localhost:11177/api
```

> **Note:** The default dev API URL assumes a proxy at port `11177`. For direct development, set it to `http://localhost:3000/api`.

---

## 3. Database Setup

### Create the database

```bash
psql -U postgres -c "CREATE DATABASE crm;"
```

### Run migrations

```bash
pnpm migration:run
```

This applies the initial migration at `apps/crm/src/migrations/1766951074630-init.ts` which creates all tables.

---

## 4. Seed the Database

**Step 1 — Seed permissions and superadmin role:**

```bash
pnpm seed:permissions
```

This creates:
- A `superadmin` role with all `global` scope permissions (all permission keys across all modules)
- A default organization if one does not exist
- A default superadmin user (see console output for credentials)

**Step 2 — Seed demo data (optional):**

```bash
pnpm seed:demo
```

This creates:
- 2 demo organizations: `Acme Corporation` and `Summit Ventures`
- 3 roles per org: `admin`, `sales_manager`, `sales_rep`
- Sample users with appropriate role assignments
- Sample leads, deals, contacts, companies, tasks, and activities

---

## 5. Start the Applications

### Start the CRM API

```bash
# Development (watch mode)
pnpm start:dev

# Production
pnpm build
pnpm start:prod
```

API is available at `http://localhost:3000/api`

### Start the Email Service

```bash
# Development
pnpm nest start email-service --watch

# Production
node dist/apps/email-service/main
```

Email service listens on TCP port `7771`. It must be running for welcome emails to work.

### Start the Frontend Dashboard

```bash
cd dashboard
pnpm install
pnpm dev
```

Dashboard available at `http://localhost:3000` (or 3001 if port 3000 is taken by the API).

---

## 6. Verify Everything Works

1. **Health check:** `GET http://localhost:3000/api/auth/me` — should return 401 (unauthorized), meaning API is running.
2. **Register a user:** `POST http://localhost:3000/api/auth/register` with `{"firstName":"Test","lastName":"User","email":"test@test.com","password":"password123"}`
3. **Login:** `POST http://localhost:3000/api/auth/login` — returns `accessToken`
4. **Check permissions:** `GET /api/auth/permissions` with `Authorization: Bearer <token>`

---

## 7. Development Scripts (package.json)

| Script | Command | Purpose |
|--------|---------|---------|
| `pnpm start:dev` | `nest start --watch` | CRM API with hot reload |
| `pnpm start:debug` | `nest start --debug --watch` | CRM API with debugger |
| `pnpm start:prod` | `node dist/apps/crm/main` | Production CRM API |
| `pnpm build` | `nest build` | Compile all apps |
| `pnpm test` | `jest` | Run unit tests |
| `pnpm test:e2e` | `jest --config ./apps/crm/test/jest-e2e.json` | End-to-end tests |
| `pnpm lint` | `eslint ... --fix` | Lint and auto-fix |
| `pnpm format` | `prettier --write ...` | Format code |
| `pnpm migration:generate` | `ts-node scripts/migration.ts generate <name>` | Generate new migration |
| `pnpm migration:run` | `ts-node scripts/migration.ts run` | Apply pending migrations |
| `pnpm migration:revert` | `ts-node scripts/migration.ts revert` | Undo last migration |
| `pnpm seed:permissions` | `ts-node scripts/seed-permissions.ts` | Seed roles + permissions |
| `pnpm seed:demo` | `ts-node scripts/seed-demo-data.ts` | Seed sample CRM data |

---

## 8. Project Layout Reference

```
apps/crm/src/
├── app.module.ts              # Root module — imports all domain modules
├── main.ts                    # Bootstrap: CORS, validation pipe, port
├── typeorm.config.shared.ts   # TypeORM config builder (used by app + scripts)
├── auth/                      # Auth, users, organizations, JWT
├── common/                    # Base entity + base service abstractions
├── activities/                # Activity logging module
├── company/                   # Company module
├── contacts/                  # Contacts module
├── deals/                     # Deals module
├── emails/                    # Email event handlers (CQRS)
├── leads/                     # Leads module
├── migrations/                # TypeORM migration files
├── permissions/               # RBAC: roles, guards, CASL
└── tasks/                     # Tasks module

apps/email-service/src/
├── main.ts                    # NestJS TCP microservice bootstrap
├── email-service.module.ts    # Root module
├── email-handler/             # BullMQ processor, mailer, template
└── message-listener/          # TCP controller (receives commands from CRM)

libs/common/src/
├── index.ts                   # Public exports
├── constants.ts               # EVENTS, ACTIONS, EMAIL_TEMPLATES
├── events/                    # UserCreatedEvent, SendEmailCommand
├── types/                     # JwtPayload, LoginResponse, RegisterResponse
└── permissions/               # PermissionScope, Permissions, OR(), AND(), Owner

dashboard/
├── app/                       # Next.js App Router pages
├── components/                # Reusable UI components
├── lib/                       # API client, React Query hooks, permission utilities
├── hooks/                     # Custom hooks (useOrganization)
└── middleware.ts              # Route protection (redirects to /login)
```
