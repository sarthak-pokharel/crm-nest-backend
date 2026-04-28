# 08 — Messaging Service Plan

> **Status: Not Yet Implemented**
>
> The messaging service is **scaffolded only** (`apps/messaging-service/src/main.ts` + `messaging-service.module.ts` exist but are empty). This document captures the full architectural plan from `MESSAGING_SERVICE_PLAN.md`.

---

## Overview

A multi-tenant messaging microservice supporting **Telegram**, **WhatsApp**, and **Facebook Messenger**. Each CRM organization can manage multiple messaging accounts and track all conversations within the CRM.

---

## Database Strategy (Hybrid)

| Storage | What it stores | Why |
|---------|---------------|-----|
| **PostgreSQL (main CRM DB)** | `MessagingAccount`, `MessageTemplate`, `ConversationMetadata` | Needs encryption, relational joins to CRM entities |
| **Cloudflare D1 (SQLite at edge)** | `messages`, `conversations` | High-volume, append-only, read-heavy; edge-distributed; isolated from main DB |
| **Redis** | WebSocket state, real-time queue | Ephemeral, fast |

---

## PostgreSQL Entities

### MessagingAccount

| Field | Type | Notes |
|-------|------|-------|
| `id` | number PK | |
| `organizationId` | number FK → organizations | |
| `platform` | enum | `telegram`, `whatsapp`, `messenger` |
| `accountName` | string | Display name |
| `accountCode` | string | Phone number, bot username, etc. |
| `credentials` | jsonb | **Encrypted** platform-specific credentials |
| `isActive` | boolean | |
| `lastSyncedAt` | timestamp | |
| `metadata` | jsonb | Platform-specific settings |
| `createdById` | number FK → user | |
| `createdAt` / `updatedAt` | timestamp | |

### MessageTemplate

| Field | Type | Notes |
|-------|------|-------|
| `id` | number PK | |
| `organizationId` | number FK | |
| `name` | string | |
| `content` | text | Template body with `{{variable}}` placeholders |
| `variables` | string[] | List of placeholder names |
| `platform` | enum nullable | `all`, `telegram`, `whatsapp`, `messenger` |
| `category` | string | |
| `isActive` | boolean | |
| `createdById` | number FK | |

### ConversationMetadata (lightweight reference table)

Links D1 conversations to CRM entities.

| Field | Type | Notes |
|-------|------|-------|
| `id` | number PK | |
| `organizationId` | number FK | |
| `conversationUuid` | string UNIQUE | References D1 `conversations.uuid` |
| `leadId` | number FK nullable | |
| `contactId` | number FK nullable | |
| `assignedToId` | number FK nullable | |
| `status` | enum | `active`, `closed`, `archived` |
| `lastMessageAt` | timestamp | |
| `unreadCount` | number | |

---

## Cloudflare D1 Schema

### messages table

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,                    -- UUID
  organization_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,            -- FK → PostgreSQL messaging_accounts.id
  conversation_uuid TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK(message_type IN ('text','image','video','document','audio','location')),
  attachments TEXT,                       -- JSON string
  external_message_id TEXT,
  external_thread_id TEXT,
  sender_user_id INTEGER,                 -- CRM user (outbound only)
  recipient_external_id TEXT,
  recipient_name TEXT,
  recipient_metadata TEXT,                -- JSON string
  status TEXT NOT NULL CHECK(status IN ('sent','delivered','read','failed')),
  sent_at TEXT,
  delivered_at TEXT,
  read_at TEXT,
  lead_id INTEGER,                        -- Denormalized CRM link
  contact_id INTEGER,
  deal_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_org_account ON messages(organization_id, account_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_uuid);
CREATE INDEX idx_messages_external_thread ON messages(external_thread_id);
CREATE INDEX idx_messages_lead ON messages(lead_id);
CREATE INDEX idx_messages_contact ON messages(contact_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
```

### conversations table

```sql
CREATE TABLE conversations (
  uuid TEXT PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  external_thread_id TEXT NOT NULL,
  participant_external_id TEXT NOT NULL,
  participant_name TEXT,
  participant_metadata TEXT,              -- JSON string
  last_message_at TEXT,
  message_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, account_id, external_thread_id)
);

CREATE INDEX idx_conversations_org_account ON conversations(organization_id, account_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
```

---

## Module Structure

```
apps/messaging-service/src/
├── main.ts
├── messaging-service.module.ts
├── database/
│   ├── d1.client.ts              ← Cloudflare D1 wrapper
│   ├── d1.migrations.sql         ← D1 schema
│   └── postgres.config.ts        ← TypeORM for accounts/templates
├── accounts/                     ← MessagingAccount CRUD (PostgreSQL)
├── messages/                     ← Message CRUD (D1)
│   └── messages.repository.ts    ← D1-specific repository
├── conversations/                ← Conversation management (D1)
│   └── conversations.repository.ts
├── templates/                    ← MessageTemplate CRUD (PostgreSQL)
├── platforms/
│   ├── telegram/
│   │   ├── telegram.service.ts
│   │   ├── telegram.webhook.controller.ts
│   │   └── telegram.client.ts
│   ├── whatsapp/
│   │   ├── whatsapp.service.ts
│   │   ├── whatsapp.webhook.controller.ts
│   │   └── whatsapp.client.ts
│   └── messenger/
│       ├── messenger.service.ts
│       ├── messenger.webhook.controller.ts
│       └── messenger.client.ts
├── webhooks/                     ← Unified inbound webhook handler
└── websockets/
    ├── messaging.gateway.ts      ← WebSocket gateway
    └── messaging.events.ts
```

---

## API Endpoints (Planned)

### Messaging Accounts

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/messaging/accounts` | Create account |
| `GET` | `/api/messaging/accounts` | List org accounts |
| `GET` | `/api/messaging/accounts/:id` | Get account |
| `PATCH` | `/api/messaging/accounts/:id` | Update account |
| `DELETE` | `/api/messaging/accounts/:id` | Delete account |
| `POST` | `/api/messaging/accounts/:id/sync` | Sync messages |
| `POST` | `/api/messaging/accounts/:id/test` | Test connection |

### Messages

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/messaging/messages` | Send message |
| `GET` | `/api/messaging/messages` | List messages |
| `GET` | `/api/messaging/messages/:id` | Get message |
| `GET` | `/api/messaging/conversations/:id/messages` | Conversation messages |
| `PATCH` | `/api/messaging/messages/:id/status` | Mark read/delivered |

### Conversations

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/messaging/conversations` | List conversations |
| `GET` | `/api/messaging/conversations/:id` | Get conversation |
| `PATCH` | `/api/messaging/conversations/:id` | Assign/update |
| `POST` | `/api/messaging/conversations/:id/close` | Close conversation |

### Templates

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/messaging/templates` | Create template |
| `GET` | `/api/messaging/templates` | List templates |
| `GET` | `/api/messaging/templates/:id` | Get template |
| `PATCH` | `/api/messaging/templates/:id` | Update template |
| `DELETE` | `/api/messaging/templates/:id` | Delete template |

### External Webhooks

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/webhooks/telegram` | Telegram update |
| `POST` | `/webhooks/whatsapp` | WhatsApp/Meta event |
| `POST` | `/webhooks/messenger` | Messenger callback |

---

## Platform Integrations

### Telegram
- Bot token stored encrypted in `credentials` field
- Register webhook URL with Telegram's Bot API
- Library: `node-telegram-bot-api` or `telegraf`
- Supports: text, images, video, documents, locations

### WhatsApp Business API
- Via Meta Cloud API or Twilio
- Stores `api_key` + `phone_number_id` in credentials
- Webhook: verify token + HMAC signature validation
- Supports: text, media, broadcast templates
- Library: `whatsapp-web.js` (unofficial) or Meta Cloud API SDK

### Facebook Messenger
- Via Meta Graph API
- Stores page access token + app secret in credentials
- Webhook: verify token + signature validation
- Supports: text, attachments, quick replies
- Library: Meta Graph API SDK

---

## Inbound Message Flow

```
1. Platform webhook → /webhooks/{platform}
2. Validate signature/token per platform rules
3. Parse platform-specific payload into unified format
4. Upsert Conversation in D1 (create if new)
5. Insert Message in D1
6. Update ConversationMetadata in PostgreSQL (lastMessageAt, unreadCount)
7. Publish MessageReceivedEvent (CQRS)
8. Broadcast via WebSocket to org room
```

## Outbound Message Flow

```
1. POST /api/messaging/messages  { accountId, conversationUuid, content, ... }
2. Look up MessagingAccount to get platform + credentials
3. Call platform API (telegram/whatsapp/messenger client)
4. On success: insert Message in D1 with status='sent'
5. Publish MessageSentEvent
6. Broadcast via WebSocket
```

---

## CQRS Events

### Published Events

```typescript
MessageReceivedEvent {
  organizationId: number
  accountId: number
  conversationId: number
  messageId: number
  content: string
  senderExternalId: string
  receivedAt: Date
}

MessageSentEvent {
  organizationId: number
  accountId: number
  conversationId: number
  messageId: number
  sentByUserId: number
}

ConversationCreatedEvent {
  organizationId: number
  conversationId: number
  participantExternalId: string
}
```

### Planned CRM Event Handlers (in CRM app)
- Auto-create Lead from new inbound conversation
- Link message to existing Contact/Lead by phone number
- Create Activity record for each message
- Notify assigned user

---

## WebSocket Gateway

Room naming:
| Room | Purpose |
|------|---------|
| `org:{orgId}` | Org-wide broadcasts |
| `conversation:{conversationId}` | Conversation-specific updates |
| `user:{userId}` | Per-user notifications |

### Events

**Client → Server:**
| Event | Description |
|-------|-------------|
| `message:send` | Send a message |
| `conversation:open` | Subscribe to conversation |
| `conversation:close` | Unsubscribe |

**Server → Client:**
| Event | Description |
|-------|-------------|
| `message:received` | New inbound message |
| `message:sent` | Outbound confirmed |
| `message:status` | Delivery/read status update |
| `conversation:updated` | Metadata changed |

---

## Permissions

```typescript
MessagingPermissions = {
  MESSAGING_ACCOUNT_CREATE: 'messaging_account:create',
  MESSAGING_ACCOUNT_READ:   'messaging_account:read',
  MESSAGING_ACCOUNT_UPDATE: 'messaging_account:update',
  MESSAGING_ACCOUNT_DELETE: 'messaging_account:delete',
  MESSAGE_SEND:             'message:send',
  MESSAGE_READ:             'message:read',
  CONVERSATION_READ:        'conversation:read',
  CONVERSATION_ASSIGN:      'conversation:assign',
  CONVERSATION_CLOSE:       'conversation:close',
  TEMPLATE_CREATE:          'template:create',
  TEMPLATE_READ:            'template:read',
  TEMPLATE_UPDATE:          'template:update',
  TEMPLATE_DELETE:          'template:delete',
}
```

---

## Multi-Tenancy Security

- All endpoints require `x-crm-org-id` header
- All D1 queries include `WHERE organization_id = ?`
- Platform `credentials` stored encrypted (algorithm TBD)
- Webhook endpoints validate platform-provided HMAC signatures before processing
