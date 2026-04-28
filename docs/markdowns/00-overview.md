# 00 — Project Overview

## What Is This Project?

A **multi-tenant CRM (Customer Relationship Management) platform** built as a monorepo. It tracks leads, deals, contacts, companies, activities, and tasks for multiple organizations, with a role-based permission system that lets organizations control exactly what each user can see and do.

---

## Monorepo Structure

```
crm-nest-backend/
├── apps/
│   ├── crm/                    # Main REST API (NestJS)
│   ├── email-service/          # Email microservice (NestJS TCP)
│   └── messaging-service/      # Messaging microservice (scaffolded)
├── dashboard/                  # Next.js frontend
├── libs/
│   └── common/                 # Shared library (types, events, permissions)
├── scripts/                    # DB seeding + migration utilities
├── static/
│   └── email-templates/        # MJML + Handlebars email templates
├── docs/
│   └── markdowns/              # This documentation
├── nest-cli.json               # NestJS monorepo config
├── package.json                # Root deps + scripts
└── tsconfig.json               # TypeScript config (strict)
```

---

## Applications at a Glance

| App | Type | Port | Purpose |
|-----|------|------|---------|
| `apps/crm` | NestJS HTTP | `3000` | Main REST API for all CRM operations |
| `apps/email-service` | NestJS TCP microservice | `7771` | Sends transactional emails via SMTP |
| `apps/messaging-service` | NestJS (scaffolded) | TBD | Future: Telegram/WhatsApp/Messenger integration |
| `dashboard` | Next.js 16 | `3001` (dev) | React frontend for the CRM |

---

## Technology Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript (strict mode) |
| Framework | NestJS 11 |
| ORM | TypeORM 0.3 |
| Database | PostgreSQL |
| Auth | Passport.js + JWT (`passport-jwt`) |
| Password hashing | bcrypt |
| Authorization | CASL v6 |
| Email queue | BullMQ + Redis |
| Email templates | MJML + Handlebars |
| Email transport | Nodemailer (SMTP) |
| CQRS | `@nestjs/cqrs` |
| Microservice transport | NestJS TCP |
| Validation | `class-validator` + `class-transformer` |
| Config | `@nestjs/config` (dotenv) |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI library | React 19 |
| Styling | Tailwind CSS |
| Data fetching | TanStack React Query v5 |
| Language | TypeScript |

### Tooling
| Tool | Purpose |
|------|---------|
| pnpm | Package manager (workspace monorepo) |
| `@nestjs/cli` | NestJS builds and code generation |
| `ts-node` | Running scripts directly |
| `tsconfig-paths` | Path aliases in scripts |
| ESLint + Prettier | Code quality |
| Jest | Unit + e2e tests |

---

## Inter-App Communication

```
┌─────────────────────┐
│   Next.js Dashboard │
│   (port 3001)       │
└─────────┬───────────┘
          │ HTTP REST + Bearer JWT
          │ Header: x-crm-org-id
          ▼
┌─────────────────────┐
│   CRM API           │
│   (port 3000)       │
│   /api/* prefix     │
└──────┬──────────────┘
       │ TCP (NestJS Microservice)
       │ emit('send_email', payload)
       ▼
┌─────────────────────┐
│   Email Service     │
│   (TCP port 7771)   │
└──────┬──────────────┘
       │ BullMQ job
       ▼
┌─────────────────────┐
│   SMTP Server       │
│   (external)        │
└─────────────────────┘
```

**CRM → Email Service flow:**
1. An event happens in CRM (e.g., user registers)
2. CRM publishes `UserCreatedEvent` via CQRS
3. `UserCreatedHandler` catches it, dispatches `SendEmailCommand`
4. `SendEmailHandler` emits it over TCP to email-service
5. Email service receives it, puts it in a BullMQ queue
6. `EmailProcessor` worker dequeues it, compiles MJML template, sends via Nodemailer

---

## Multi-Tenancy Model

Every user can belong to **multiple organizations**. Resources (leads, deals, contacts, etc.) are always scoped to an organization via `organizationId`.

- The active organization context is passed per-request via the `x-crm-org-id` HTTP header.
- If no header is provided, the first organization the user belongs to is used.
- All `TenantBaseEntity` subclasses carry `organizationId`, `createdById`, `updatedById`, `createdAt`, `updatedAt`.

---

## Permission System Overview

Permissions follow a **hierarchical scope model**:

```
GLOBAL > COMPANY > DEPARTMENT > TEAM > SELF > OWNER
```

- Each user has **Roles** (global via `user_roles` or per-org via `user_organization_roles`).
- Each Role has **RolePermissions** (`permissionKey` + `scope`).
- Permission keys use `resource:action` format (e.g., `lead:read`, `deal:approve`).
- The `@Permission()` decorator on controllers enforces access.
- The `PermissionGuard` resolves the user's CASL ability and evaluates requirements.

---

## Key Conventions

| Convention | Detail |
|-----------|--------|
| API prefix | All routes prefixed with `/api` |
| Tenant header | `x-crm-org-id: <number>` |
| Auth header | `Authorization: Bearer <jwt>` |
| Permission decorator | `@Permission(LeadPermissions.READ)` |
| OR combinator | `@Permission(OR(Owner, LeadPermissions.UPDATE))` |
| Base service | All domain services extend `TenantBaseService` |
| Base entity | All domain entities extend `TenantBaseEntity` |
| DTO validation | `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` |
| Migrations | Manual — `pnpm migration:generate <name>` then `pnpm migration:run` |
