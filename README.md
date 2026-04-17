# CRM Platform -- Backend

A production-grade, multi-tenant Customer Relationship Management system built as a NestJS monorepo. The backend powers a full-featured CRM with lead tracking, deal pipelines, contact and company management, activity logging, task management, and a granular role-based access control system. It includes a dedicated email microservice for transactional emails and is designed with clean architecture principles for maintainability and scalability.

## Screenshots

![Dashboard Overview](docs/images/1.png)

![Lead Management](docs/images/2.png)

![Deal Pipeline](docs/images/3.png)

![Contact Details](docs/images/4.png)

![Company Management](docs/images/5.png)

![Task Management](docs/images/6.png)

![Role-Based Permissions](docs/images/7.png)

## Tech Stack

- **Runtime:** Node.js with TypeScript (strict mode)
- **Framework:** NestJS 11 (monorepo structure)
- **Database:** PostgreSQL with TypeORM
- **Authentication:** JWT with Passport.js, bcrypt password hashing
- **Authorization:** CASL-based attribute-level access control with hierarchical permission scopes
- **Email:** Dedicated microservice with BullMQ job queues, Handlebars + MJML templating, Nodemailer transport
- **Validation:** class-validator and class-transformer for DTO validation
- **Architecture:** CQRS pattern via @nestjs/cqrs, event-driven microservice communication
- **Package Manager:** pnpm

## Monorepo Structure

```
apps/
  crm/                    # Main CRM API application
  email-service/          # Email microservice (event-driven)
  messaging-service/      # Messaging microservice (scaffolded)
libs/
  common/                 # Shared types, events, constants, permission definitions
scripts/                  # Database migrations, seed scripts
static/
  email-templates/        # MJML email templates with layouts and partials
```

## Features

### Core CRM Modules
- **Leads** -- Create, track, and convert leads with status workflows and scoring
- **Deals** -- Manage sales pipeline with stages, values, and close dates
- **Contacts** -- Store and organize contact information with relationship tracking
- **Companies** -- Company profiles with size, industry, and location data
- **Activities** -- Log calls, meetings, emails, and other interactions
- **Tasks** -- Task assignment, due dates, priority levels, and completion tracking

### Multi-Tenancy
- Full organization-based data isolation
- Users can belong to multiple organizations with different roles
- Organization switching with scoped data access
- Tenant-aware base service for automatic query scoping

### Authentication and Authorization
- JWT-based authentication with secure token generation
- User registration and login with bcrypt password hashing
- CASL-powered permission system with 6 hierarchical scopes: Global, Company, Department, Team, Self, and Owner
- Role management with granular permission assignment per resource and action
- Permission guard that enforces access control on every protected endpoint

### Email Microservice
- Decoupled microservice architecture using NestJS microservices
- BullMQ-backed job queue for reliable email delivery
- MJML templates compiled to responsive HTML
- Handlebars templating for dynamic content
- Event-driven triggers (user registration, etc.)

### API Design
- RESTful endpoints with consistent CRUD patterns
- DTO-based request validation with class-validator
- Proper HTTP status codes and error handling
- Pagination and filtering support

## Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- pnpm >= 8
- Redis (for BullMQ email queue)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=crm

JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=1d

REDIS_HOST=localhost
REDIS_PORT=6379

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
```

### 3. Run database migrations

```bash
pnpm run migration:run
```

### 4. Seed permissions and roles

```bash
pnpm run seed:permissions
```

### 5. Seed demo data (optional)

```bash
pnpm run seed:demo
```

This populates the database with sample organizations, users, companies, leads, contacts, deals, activities, and tasks for demonstration purposes.

### 6. Start the application

```bash
# Development mode with hot reload
pnpm run start:dev

# Production mode
pnpm run start:prod
```

The API runs on `http://localhost:3000` by default.

### 7. Start the email microservice (optional)

```bash
pnpm run start email-service
```

## API Endpoints

| Resource | Endpoints | Description |
|---|---|---|
| `/auth` | `POST /login`, `POST /register`, `GET /me`, `GET /permissions` | Authentication and user session |
| `/users` | `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id` | User management |
| `/organizations` | Full CRUD + `/stats`, `/users` management | Multi-tenant organization management |
| `/leads` | Full CRUD + `PATCH /:id/status` | Lead tracking and status updates |
| `/deals` | Full CRUD + `GET /pipeline` | Deal pipeline management |
| `/contacts` | Full CRUD | Contact management |
| `/companies` | Full CRUD | Company management |
| `/activities` | Full CRUD + `GET /upcoming` | Activity logging and scheduling |
| `/tasks` | Full CRUD + `GET /my-tasks`, `GET /overdue`, `PATCH /:id/complete` | Task management |
| `/roles` | Full CRUD + `GET /:id/permissions`, `PUT /:id/permissions` | Role and permission management |

## Database Schema

13 entities with full relational mapping:

- **User** -- Authentication credentials and profile
- **Organization** -- Tenant isolation boundary
- **UserOrganizationRole** -- Many-to-many user-organization-role mapping
- **Role** -- Named permission groups
- **RolePermission** -- Individual permission entries per role
- **UserRole** -- User-to-role assignments
- **Company** -- Business entity profiles
- **Lead** -- Sales leads with status and scoring
- **Contact** -- Individual contact records
- **Deal** -- Sales opportunities with pipeline stages
- **Activity** -- Interaction logs (calls, meetings, emails)
- **Task** -- Assignable work items with due dates

## Available Scripts

| Script | Description |
|---|---|
| `pnpm run start:dev` | Start in development mode with hot reload |
| `pnpm run start:prod` | Start in production mode |
| `pnpm run build` | Build the application |
| `pnpm run migration:generate` | Generate a new migration |
| `pnpm run migration:run` | Run pending migrations |
| `pnpm run migration:revert` | Revert the last migration |
| `pnpm run seed:permissions` | Seed roles and permissions |
| `pnpm run seed:demo` | Seed demo data for showcase |
| `pnpm run test` | Run unit tests |
| `pnpm run test:e2e` | Run end-to-end tests |
| `pnpm run lint` | Lint and fix code |

## Project Highlights

- **Production patterns** -- Multi-tenant data isolation, CASL-based RBAC, event-driven microservices, job queues for reliability
- **Clean architecture** -- Modular NestJS structure with shared libraries, base classes, and consistent patterns across all modules
- **Type safety** -- Strict TypeScript throughout with DTOs, entities, and interfaces
- **Scalable design** -- Microservice-ready with decoupled email service, messaging service scaffold, and event-driven communication

## License

MIT
