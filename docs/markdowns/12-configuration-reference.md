# 12 — Configuration Reference

## CRM App (`apps/crm`) — `.env`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✓ | — | PostgreSQL connection string. Format: `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET` | ✓ | `fallbackSecret` | Secret key for JWT signing and verification |
| `JWT_EXPIRES_IN` | | `3600` | JWT expiry in seconds |
| `PORT` | | `3000` | HTTP server port |
| `REDIS_HOST` | ✓ (for email queue) | `localhost` | Redis host (used by email-service, not CRM directly) |
| `REDIS_PORT` | | `6379` | Redis port |

> **Security warning:** `fallbackSecret` is only for local development. Always set a strong `JWT_SECRET` in production.

---

## Email Service (`apps/email-service`) — `.env`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_HOST` | ✓ | `localhost` | Redis hostname for BullMQ |
| `REDIS_PORT` | | `6379` | Redis port |
| `SMTP_HOST` | ✓ | — | SMTP server hostname (e.g., `smtp.gmail.com`, `localhost`) |
| `SMTP_PORT` | | `587` | SMTP port. Use `465` for SSL, `587` for STARTTLS |
| `SMTP_USER` | ✓ | — | SMTP authentication username |
| `SMTP_PASS` | ✓ | — | SMTP authentication password |
| `SMTP_FROM` | | `"My App" <noreply@myapp.com>` | Sender name + address shown to recipients |
| `EMAIL_RETRY_ATTEMPTS` | | `3` | Max BullMQ job retry attempts on failure |

---

## Frontend Dashboard (`dashboard`) — `.env.local`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | | `http://localhost:11177/api` | CRM backend base URL |

---

## Runtime Configuration Notes

### CRM App Bootstrap (`apps/crm/src/main.ts`)

| Setting | Value | Notes |
|---------|-------|-------|
| Global API prefix | `/api` | All routes: `POST /api/auth/login`, etc. |
| CORS origins | `http://localhost:3000`, `http://localhost:3001` | Must update for production |
| CORS credentials | `true` | Required for cookie-based auth guard in Next.js |
| CORS allowed headers | `Content-Type`, `Authorization`, `x-crm-org-id` | `x-crm-org-id` must be included |
| ValidationPipe `whitelist` | `true` | Strips undeclared DTO properties |
| ValidationPipe `forbidNonWhitelisted` | `true` | Throws on undeclared properties |
| ValidationPipe `transform` | `true` | Auto-transforms primitives (e.g., string → number for `@IsNumber()`) |

### Email Service Bootstrap (`apps/email-service/src/main.ts`)

| Setting | Value |
|---------|-------|
| Transport | TCP |
| Host | `127.0.0.1` (localhost only) |
| Port | `7771` |

The email service only listens on localhost — it is not publicly exposed.

### JWT Configuration (`apps/crm/src/auth/auth.module.ts`)

```typescript
JwtModule.registerAsync({
  useFactory: (config: ConfigService) => ({
    secret: config.get('JWT_SECRET', 'fallbackSecret'),
    signOptions: {
      expiresIn: Number(config.get('JWT_EXPIRES_IN', '3600')),
    },
  }),
});
```

Note: `JWT_EXPIRES_IN` is cast with `Number()` — provide the value in **seconds** (e.g., `3600` = 1 hour, `86400` = 1 day).

### TypeORM Configuration (`apps/crm/src/typeorm.config.shared.ts`)

```typescript
{
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['apps/crm/src/**/*.entity{.ts,.js}'],
  migrations: ['apps/crm/src/migrations/**{.ts,.js}'],
  synchronize: false,   // NEVER set to true in production
  logging: NODE_ENV === 'development',
}
```

### BullMQ Queue Configuration (`apps/email-service/src/email-handler/email-handler.module.ts`)

```typescript
{
  defaultJobOptions: {
    removeOnComplete: true,          // Clean up completed jobs
    removeOnFail: false,             // Keep failed jobs for inspection
    attempts: EMAIL_RETRY_ATTEMPTS,  // Default: 3
    backoff: {
      type: 'exponential',
      delay: 2000,                   // 2s, 4s, 8s between retries
    },
  },
}
```

### EmailProcessor Rate Limits

```typescript
@Processor('email', {
  concurrency: 5,                    // 5 jobs processed simultaneously
  limiter: { max: 10, duration: 1000 }, // Max 10 emails per second
})
```

---

## Environment File Locations

| App | File |
|-----|------|
| CRM app | `apps/crm/.env` or root `.env` |
| Email service | `.env` (same root, `ConfigModule.forRoot()` reads from CWD) |
| Frontend | `dashboard/.env.local` |

> Both NestJS apps call `ConfigModule.forRoot({ isGlobal: true })` without an explicit `envFilePath`, so they read from the **current working directory** at startup. When starting from the monorepo root with `pnpm start:crm`, the CWD is the repo root, so place `.env` at the root.

---

## Monorepo Build Configuration

### nest-cli.json

```json
{
  "monorepo": true,
  "root": "apps/crm",
  "sourceRoot": "apps/crm/src",
  "compilerOptions": {
    "webpack": true,
    "tsConfigPath": "apps/crm/tsconfig.app.json"
  },
  "projects": {
    "crm": { "type": "application", "root": "apps/crm", ... },
    "email-service": { "type": "application", "root": "apps/email-service", ... },
    "messaging-service": { "type": "application", "root": "apps/messaging-service", ... }
  }
}
```

### tsconfig.json Path Aliases

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

### Package Scripts (`package.json`)

| Script | Command |
|--------|---------|
| `start:crm` | `nest start crm --watch` |
| `start:email` | `nest start email-service --watch` |
| `start:messaging` | `nest start messaging-service --watch` |
| `build` | `nest build` |
| `migration:run` | `ts-node scripts/migration.ts run` |
| `migration:revert` | `ts-node scripts/migration.ts revert` |
| `migration:generate` | `ts-node scripts/migration.ts generate` |
| `seed:permissions` | `ts-node scripts/seed-permissions.ts` |
| `seed:demo` | `ts-node scripts/seed-demo-data.ts` |
| `test` | `jest` |
| `test:e2e` | `jest --config apps/crm/test/jest-e2e.json` |

---

## Production Checklist

- [ ] Set strong `JWT_SECRET` (min 32 chars, random)
- [ ] Update CORS origins in `apps/crm/src/main.ts`
- [ ] Set `NODE_ENV=production` to disable TypeORM query logging
- [ ] Ensure `synchronize: false` in TypeORM config
- [ ] Email service not publicly exposed (TCP on `127.0.0.1:7771`)
- [ ] SMTP credentials secured (use secrets manager, not plain env)
- [ ] Redis secured with password if exposed
- [ ] Run `pnpm migration:run` before first deploy
- [ ] Run `pnpm seed:permissions` once after first migration
