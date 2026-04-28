# 07 — Email Service

## Overview

The email service is a standalone **NestJS TCP microservice** that receives send-email commands from the CRM app, queues them via **BullMQ + Redis**, and delivers them via **Nodemailer SMTP**. Email bodies are built from **MJML + Handlebars** templates.

---

## Bootstrap

**File:** `apps/email-service/src/main.ts`

```typescript
NestFactory.createMicroservice(EmailServiceModule, {
  transport: Transport.TCP,
  options: { host: '127.0.0.1', port: 7771 },
})
```

- Listens on TCP, not HTTP
- No REST endpoints — only message patterns
- Requires Redis and SMTP configuration via `.env`

---

## Module Structure

```
EmailServiceModule
  ├── MessageListenerModule     ← TCP controller, receives events from CRM
  └── EmailHandlerModule        ← CQRS command handler + BullMQ + SMTP sender
```

### MessageListenerModule

**File:** `apps/email-service/src/message-listener/message-listener.module.ts`

- Imports `CqrsModule` and `ConfigModule`
- Registers `EmailHandler` as a controller
- Does not register any providers — relies on CqrsModule's CommandBus

### EmailHandlerModule

**File:** `apps/email-service/src/email-handler/email-handler.module.ts`

- Imports `CqrsModule`, `ConfigModule`
- Sets up BullMQ with Redis connection (from `REDIS_HOST`, `REDIS_PORT`)
- Registers the `email` queue with:
  - `removeOnComplete: true`
  - `removeOnFail: false`
  - `attempts: EMAIL_RETRY_ATTEMPTS` (default 3)
  - `backoff: { type: 'exponential', delay: 2000 }`
- Providers: `EmailCommandHandler`, `EmailProcessor`, `TemplateService`, `MailerService`

---

## Message Flow

```
CRM App
  │
  │  (1) UserCreatedEvent published → UserCreatedHandler
  │
  │  (2) UserCreatedHandler executes SendEmailCommand via CommandBus
  │
  │  (3) SendEmailHandler (@CommandHandler(SendEmailCommand)) in CRM
  │        → client.emit('send_email', { recipient, ...emailData })
  │           via ClientProxy injected as 'EMAIL_SERVICE' (TCP to port 7771)
  │
Email Service
  │
  │  (4) EmailHandler.handleSendEmail() receives @EventPattern('send_email')
  │        → commandBus.execute(new SendEmailCommand(...))
  │
  │  (5) EmailCommandHandler adds job to 'email' BullMQ queue:
  │        { to, subject, templateName, templateData }
  │
  │  (6) EmailProcessor processes job:
  │        a. templateService.compile(templateName, context) → HTML
  │        b. mailerService.send(to, subject, html)
  │
  └─► SMTP → delivered
```

---

## CRM-Side Plumbing

### SendEmailHandler (in CRM app)

**File:** `apps/crm/src/emails/core/send-email.emit.ts`

```typescript
@CommandHandler(SendEmailCommand)
export class SendEmailHandler {
  constructor(@Inject('EMAIL_SERVICE') private client: ClientProxy) {}

  async execute(command: SendEmailCommand) {
    return this.client.emit(command.action, {
      recipient: command.recipient,
      ...command.data,
    });
  }
}
```

`EMAIL_SERVICE` ClientProxy is registered in `EmailsModule` via `ClientsModule.register()` with TCP transport pointing to `127.0.0.1:7771`.

### UserCreatedHandler (in CRM app)

**File:** `apps/crm/src/emails/handlers/user-created.handler.ts`

Triggered on `UserCreatedEvent`. Sends a welcome email:
- `template`: `'welcome-email'`
- `subject`: `'Welcome to Our CRM Platform'`
- `context`: `{ name: user.firstName }`

---

## Email Service Components

### EmailHandler (TCP Controller)

**File:** `apps/email-service/src/message-listener/email.controller.ts`

```typescript
@EventPattern(ACTIONS.SEND_EMAIL)  // 'send_email'
async handleSendEmail(@Payload() data: any) {
  return this.commandBus.execute(
    new SendEmailCommand(ACTIONS.SEND_EMAIL, data.recipient, data)
  );
}
```

Receives the TCP payload and delegates to CQRS CommandBus.

---

### EmailCommandHandler

**File:** `apps/email-service/src/email-handler/email.handler.ts`

```typescript
@CommandHandler(SendEmailCommand)
async execute(command: SendEmailCommand) {
  await this.emailQueue.add('send-email', {
    to: command.recipient,
    subject: command.data.subject,
    templateName: command.data.template,
    templateData: command.data.context,
  });
  return { status: 'queued', recipient: command.recipient };
}
```

Enqueues the job and returns immediately — delivery is async.

---

### EmailProcessor (BullMQ Worker)

**File:** `apps/email-service/src/email-handler/email.processor.ts`

```typescript
@Processor('email', { concurrency: 5, limiter: { max: 10, duration: 1000 } })
```

- **Concurrency**: 5 simultaneous jobs
- **Rate limit**: max 10 emails per 1000ms (1 second)
- **Retry**: on error, re-throws — BullMQ handles retry with exponential backoff (3 attempts, starting at 2s)

Job execution:
1. Calls `templateService.compile(templateName, { ...templateData, year: currentYear })`
2. Calls `mailerService.send(to, subject, html)`
3. On success: logs completion
4. On failure: logs error + throws to trigger retry

---

### TemplateService

**File:** `apps/email-service/src/email-handler/template.service.ts`

Initializes on `OnModuleInit` by loading all templates and partials from `static/email-templates/` into memory.

#### Initialization Steps

1. **Register Handlebars Partials** — reads every `.hbs` file from `static/email-templates/partials/`, registers each by filename (without extension) as `{{> partialName}}`
2. **Cache Layout** — reads `static/email-templates/layouts/main.hbs` as raw string
3. **Cache Templates** — scans subdirectories (excluding `partials` and `layouts`); for each one with a `body.hbs`, compiles it and caches under the directory name

#### `compile(templateName, context): string`

1. Looks up template from cache → throws if not found
2. Renders `body.hbs` template with `context` → raw MJML body content
3. Compiles `layouts/main.hbs` and renders with `{ ...context, body: bodyContent }`
4. Converts the resulting MJML string to HTML via `mjml2html()`
5. Logs any MJML errors
6. Returns final HTML string

---

### MailerService

**File:** `apps/email-service/src/email-handler/mailer.service.ts`

Creates a Nodemailer transporter on construction using SMTP config from env.

```typescript
send(to: string, subject: string, html: string): Promise<SentMessageInfo>
```

- From address from `SMTP_FROM` env (default: `"My App" <noreply@myapp.com>`)
- Logs success with `messageId`
- Logs error and re-throws on failure

**`secure` flag logic:** automatically set to `true` only when `SMTP_PORT == 465`.

---

## Email Templates

**Location:** `static/email-templates/`

```
static/email-templates/
  layouts/
    main.hbs           ← outer MJML wrapper; receives {{{ body }}} placeholder
  partials/
    *.hbs              ← reusable Handlebars partials
  welcome-email/
    body.hbs           ← welcome email body MJML fragment
```

### Template Contract

Every template folder must contain a `body.hbs` with valid **MJML fragments** (not a full `<mjml>` document — the layout wraps it).

The layout injects body content via triple-mustache `{{{ body }}}` to allow raw MJML.

### Adding a New Template

1. Create folder: `static/email-templates/my-template/`
2. Create `body.hbs` with MJML content and Handlebars variables
3. Use constant in `libs/common/src/constants.ts`:
   ```typescript
   EMAIL_TEMPLATES.MY_TEMPLATE = 'my-template'
   ```
4. In the event handler, pass `template: EMAIL_TEMPLATES.MY_TEMPLATE` and the required `context` fields

---

## Shared Constants

**File:** `libs/common/src/constants.ts`

```typescript
EVENTS = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
}

ACTIONS = {
  SEND_EMAIL: 'send_email',
}

EMAIL_TEMPLATES = {
  WELCOME_EMAIL: 'welcome-email',
}
```

---

## Required Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis host for BullMQ |
| `REDIS_PORT` | `6379` | Redis port |
| `SMTP_HOST` | — | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP port (465 = SSL) |
| `SMTP_USER` | — | SMTP auth username |
| `SMTP_PASS` | — | SMTP auth password |
| `SMTP_FROM` | `"My App" <noreply@myapp.com>` | Sender address |
| `EMAIL_RETRY_ATTEMPTS` | `3` | Max BullMQ retry attempts |

---

## Error Handling

| Layer | On Error | Behaviour |
|-------|----------|-----------|
| `EmailProcessor` | `send()` or `compile()` fails | Re-throws → BullMQ retries up to `EMAIL_RETRY_ATTEMPTS` with exponential backoff starting at 2s |
| `MailerService.send()` | Nodemailer throws | Logs error stack + re-throws |
| `TemplateService.compile()` | Template not found | Throws `Error("Email template not found")` — not retried, job fails immediately |
| `TemplateService.compile()` | MJML parse errors | Logs errors but continues — partial HTML may be returned |

Failed jobs remain in BullMQ (`removeOnFail: false`) for inspection.
