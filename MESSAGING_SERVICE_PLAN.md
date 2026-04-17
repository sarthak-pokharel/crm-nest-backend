# Messaging Service Architecture Plan

## Overview
Multi-tenant messaging microservice supporting Telegram, WhatsApp, and Messenger integrations. Each organization can manage multiple messaging accounts and track all conversations within the CRM.

---

## 1. Database Schema (Hybrid Architecture)

### **PostgreSQL (Main CRM DB)** - Metadata & Integration

#### MessagingAccount
Stores company messaging accounts (Telegram/WhatsApp/Messenger)
```typescript
{
  id: number (PK)
  organizationId: number (FK → organizations)
  platform: enum ('telegram', 'whatsapp', 'messenger')
  accountName: string // Display name
  accountCode: string // Unique identifier (e.g., phone number, bot token)
  credentials: jsonb // Encrypted platform-specific credentials
  isActive: boolean
  lastSyncedAt: timestamp
  metadata: jsonb // Platform-specific settings
  createdById: number (FK → user)
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### MessageTemplate
Reusable message templates
```typescript
{
  id: number (PK)
  organizationId: number (FK → organizations)
  name: string
  content: text
  variables: string[] // Placeholders like {{firstName}}
  platform: enum ('all', 'telegram', 'whatsapp', 'messenger', nullable)
  category: string
  isActive: boolean
  createdById: number
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### ConversationMetadata (Lightweight reference table)
Links conversations to CRM entities
```typescript
{
  id: number (PK)
  organizationId: number (FK → organizations)
  conversationUuid: string (UNIQUE) // References D1 conversation
  
  // CRM linking
  leadId: number (FK → leads, nullable)
  contactId: number (FK → contacts, nullable)
  assignedToId: number (FK → user, nullable)
  
  status: enum ('active', 'closed', 'archived')
  lastMessageAt: timestamp
  unreadCount: number
  
  createdAt: timestamp
  updatedAt: timestamp
}
```

---

### **Cloudflare D1 (SQLite)** - High-Volume Message Storage

#### messages
Stores all sent/received messages
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY, -- UUID
  organization_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL, -- References PostgreSQL messaging_accounts.id
  conversation_uuid TEXT NOT NULL,
  
  -- Message content
  direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK(message_type IN ('text', 'image', 'video', 'document', 'audio', 'location')),
  attachments TEXT, -- JSON string
  
  -- External references
  external_message_id TEXT,
  external_thread_id TEXT,
  
  -- Participants
  sender_user_id INTEGER, -- CRM user who sent (for outbound)
  recipient_external_id TEXT,
  recipient_name TEXT,
  recipient_metadata TEXT, -- JSON string
  
  -- Tracking
  status TEXT NOT NULL CHECK(status IN ('sent', 'delivered', 'read', 'failed')),
  sent_at TEXT, -- ISO timestamp
  delivered_at TEXT,
  read_at TEXT,
  
  -- CRM integration (denormalized for quick filtering)
  lead_id INTEGER,
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

#### conversations
Groups messages into conversations/threads
```sql
CREATE TABLE conversations (
  uuid TEXT PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  
  external_thread_id TEXT NOT NULL,
  participant_external_id TEXT NOT NULL,
  participant_name TEXT,
  participant_metadata TEXT, -- JSON string
  
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

## 2. Microservice Architecture

### Messaging Service (NestJS + Cloudflare Workers)
**Location:** `apps/messaging-service/`

**Database Strategy:**
- **Cloudflare D1 (SQLite):** Message storage, conversations, message history
- **Main PostgreSQL:** Messaging accounts, templates (low volume, needs encryption)
- **Redis:** WebSocket state, real-time message queue

**Why D1?**
- High-volume message storage (append-only, read-heavy)
- Edge-distributed, low latency for message retrieval
- Isolated from main CRM transactional database
- Cost-effective at scale
- Natural separation of concerns

**Responsibilities:**
- Manage messaging accounts (CRUD) - PostgreSQL
- Send messages through platform APIs
- Receive webhooks from platforms (Telegram, WhatsApp, Messenger)
- Message storage and retrieval - D1
- Conversation management - D1
- Real-time message delivery via WebSocket

**Module Structure:**
```
apps/messaging-service/
├── src/
│   ├── main.ts
│   ├── messaging-service.module.ts
│   ├── database/
│   │   ├── d1.client.ts              # Cloudflare D1 client wrapper
│   │   ├── d1.migrations.sql         # D1 schema
│   │   └── postgres.config.ts        # TypeORM for accounts/templates
│   ├── accounts/                     # Messaging account management (PostgreSQL)
│   │   ├── accounts.controller.ts
│   │   ├── accounts.service.ts
│   │   ├── entities/messaging-account.entity.ts
│   │   └── dto/
│   ├── messages/                     # Message CRUD (D1)
│   │   ├── messages.controller.ts
│   │   ├── messages.service.ts
│   │   ├── messages.repository.ts    # D1 repository
│   │   └── dto/
│   ├── conversations/                # Conversation management (D1)
│   │   ├── conversations.controller.ts
│   │   ├── conversations.service.ts
│   │   ├── conversations.repository.ts
│   │   └── dto/
│   ├── templates/                    # Message templates (PostgreSQL)
│   │   ├── templates.controller.ts
│   │   ├── templates.service.ts
│   │   └── entities/template.entity.ts
│   ├── platforms/                    # Platform integrations
│   │   ├── telegram/
│   │   │   ├── telegram.service.ts
│   │   │   ├── telegram.webhook.controller.ts
│   │   │   └── telegram.client.ts
│   │   ├── whatsapp/
│   │   │   ├── whatsapp.service.ts
│   │   │   ├── whatsapp.webhook.controller.ts
│   │   │   └── whatsapp.client.ts
│   │   └── messenger/
│   │       ├── messenger.service.ts
│   │       ├── messenger.webhook.controller.ts
│   │       └── messenger.client.ts
│   ├── webhooks/                     # Unified webhook handler
│   │   ├── webhooks.controller.ts
│   │   └── webhooks.service.ts
│   └── websockets/                   # Real-time messaging
│       ├── messaging.gateway.ts
│       └── messaging.events.ts
```

---

## 3. API Endpoints

### Messaging Accounts
```
POST   /api/messaging/accounts                 # Create account
GET    /api/messaging/accounts                 # List org accounts
GET    /api/messaging/accounts/:id             # Get account
PATCH  /api/messaging/accounts/:id             # Update account
DELETE /api/messaging/accounts/:id             # Delete account
POST   /api/messaging/accounts/:id/sync        # Sync messages
POST   /api/messaging/accounts/:id/test        # Test connection
```

### Messages
```
POST   /api/messaging/messages                 # Send message
GET    /api/messaging/messages                 # List messages (filtered)
GET    /api/messaging/messages/:id             # Get message
GET    /api/messaging/conversations/:id/messages  # Get conversation messages
PATCH  /api/messaging/messages/:id/status      # Mark as read/delivered
```

### Conversations
```
GET    /api/messaging/conversations            # List conversations
GET    /api/messaging/conversations/:id        # Get conversation
PATCH  /api/messaging/conversations/:id        # Update (assign user, status)
POST   /api/messaging/conversations/:id/close  # Close conversation
```

### Templates
```
POST   /api/messaging/templates                # Create template
GET    /api/messaging/templates                # List templates
GET    /api/messaging/templates/:id            # Get template
PATCH  /api/messaging/templates/:id            # Update template
DELETE /api/messaging/templates/:id            # Delete template
```

### Webhooks (External)
```
POST   /webhooks/telegram                      # Telegram webhook
POST   /webhooks/whatsapp                      # WhatsApp webhook (Meta)
POST   /webhooks/messenger                     # Messenger webhook
```

---

## 4. Platform Integration Strategy

### Telegram
- **Bot API:** Create bot via @BotFather
- **Credentials:** Bot token stored encrypted
- **Webhook:** Register webhook URL with Telegram
- **Features:** Text, images, videos, documents, locations
- **Library:** `node-telegram-bot-api` or `telegraf`

### WhatsApp Business API
- **Provider:** Meta Cloud API or Twilio
- **Credentials:** API key, phone number ID
- **Webhook:** Verify token + signature validation
- **Features:** Text, media, templates (for broadcasts)
- **Library:** `whatsapp-web.js` (unofficial) or Meta Cloud API

### Facebook Messenger
- **Provider:** Meta Graph API
- **Credentials:** Page access token, app secret
- **Webhook:** Verify token + signature validation
- **Features:** Text, attachments, quick replies
- **Library:** Meta Graph API SDK

---

## 5. Event-Driven Architecture

### Events Published (CQRS)
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

### Event Handlers (in CRM app)
- Auto-create lead from new conversation
- Link message to existing contact/lead
- Create activity record for message
- Trigger notifications to assigned users

---

## 6. Multi-Tenant Security

### Organization Scoping
- All endpoints require `x-crm-org-id` header
- Validate user belongs to organization
- Filter all queries by `organizationId`
- Encrypt platform credentials per organization

### Permissions
```typescript
MessagingPermissions = {
  MESSAGING_ACCOUNT_CREATE: 'messaging_account:create',
  MESSAGING_ACCOUNT_READ: 'messaging_account:read',
  MESSAGING_ACCOUNT_UPDATE: 'messaging_account:update',
  MESSAGING_ACCOUNT_DELETE: 'messaging_account:delete',
  
  MESSAGE_SEND: 'message:send',
  MESSAGE_READ: 'message:read',
  
  CONVERSATION_READ: 'conversation:read',
  CONVERSATION_ASSIGN: 'conversation:assign',
  
  TEMPLATE_CREATE: 'template:create',
  TEMPLATE_READ: 'template:read',
}
```

---

## 7. Real-Time Features (WebSocket)

### Gateway Events
```typescript
// Client → Server
'message:send'           // Send message
'conversation:open'      // Subscribe to conversation updates
'conversation:close'     // Unsubscribe

// Server → Client
'message:received'       // New incoming message
'message:sent'           // Outbound message confirmed
'message:status'         // Status update (delivered/read)
'conversation:updated'   // Conversation metadata changed
```

### Room-Based Broadcasting
- `org:{organizationId}` - Org-wide updates
- `conversation:{conversationId}` - Conversation-specific updates
- `user:{userId}` - User-specific notifications

---

## 8. Message Processing Flow

### Inbound Message Flow
```
1. Platform Webhook → Webhook Controller
2. Validate signature/token
3. Parse platform-specific payload
4. Create/update Conversation
5. Store Message in DB
6. Publish MessageReceivedEvent
7. Broadcast via WebSocket to active users
8. CRM event handler auto-links to Lead/Contact
```

### Outbound Message Flow
```
1. User sends via API or WebSocket
2. Validate user permissions
3. Get MessagingAccount credentials
4. Call platform API (Telegram/WhatsApp/Messenger)
5. Store Message with status 'sent'
6. Wait for delivery confirmation via webhook
7. Update message status
8. Broadcast status update via WebSocket
```

---

## 9. Configuration & Environment

```env
# Messaging Service
MESSAGING_SERVICE_PORT=11178
MESSAGING_DATABASE_URL=postgres://... # For accounts, templates, conversation metadata
MESSAGING_JWT_SECRET=shared_secret

# Cloudflare D1
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_D1_DATABASE_ID=your_d1_database_id
CLOUDFLARE_API_TOKEN=your_api_token # With D1 edit permissions
CLOUDFLARE_D1_API_URL=https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}

# Telegram
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/webhooks/telegram

# WhatsApp (Meta Cloud API)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_VERIFY_TOKEN=random_string_for_webhook_verification

# Messenger
MESSENGER_APP_SECRET=from_facebook_app
MESSENGER_VERIFY_TOKEN=random_string_for_webhook_verification

# Redis (for WebSocket state)
REDIS_URL=redis://localhost:6379
```

---

## 10. D1 Setup & Deployment

### Create D1 Database
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 create crm-messages

# Output will give you database ID and account ID
# Database created: crm-messages
# Database ID: xxxxx-xxxx-xxxx-xxxx-xxxxxxxxx
```

### Apply Schema
```bash
# Create schema file
cat > d1-schema.sql << 'EOF'
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  conversation_uuid TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL,
  attachments TEXT,
  external_message_id TEXT,
  external_thread_id TEXT,
  sender_user_id INTEGER,
  recipient_external_id TEXT,
  recipient_name TEXT,
  recipient_metadata TEXT,
  status TEXT NOT NULL,
  sent_at TEXT,
  delivered_at TEXT,
  read_at TEXT,
  lead_id INTEGER,
  contact_id INTEGER,
  deal_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_org_account ON messages(organization_id, account_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_uuid);
CREATE INDEX idx_messages_external_thread ON messages(external_thread_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

CREATE TABLE conversations (
  uuid TEXT PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  external_thread_id TEXT NOT NULL,
  participant_external_id TEXT NOT NULL,
  participant_name TEXT,
  participant_metadata TEXT,
  last_message_at TEXT,
  message_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, account_id, external_thread_id)
);

CREATE INDEX idx_conversations_org_account ON conversations(organization_id, account_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
EOF

# Execute schema
wrangler d1 execute crm-messages --file=d1-schema.sql
```

### D1 API Access
```typescript
// Example: Query messages from D1 via HTTP API
const response = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sql: 'SELECT * FROM messages WHERE conversation_uuid = ? ORDER BY created_at DESC LIMIT 50',
      params: [conversationUuid]
    })
  }
);
```

---

## 10. Implementation Phases

### Phase 1: Core Infrastructure (Day 1-2)
- [x] Plan architecture with D1 hybrid approach
- [ ] Create messaging-service app scaffold
- [ ] Set up D1 database and schema
- [ ] Create D1 service wrapper (HTTP API client)
- [ ] Define PostgreSQL entities (accounts, templates, conversation metadata)
- [ ] Run migrations for PostgreSQL tables
- [ ] Set up shared authentication with CRM
- [ ] Implement accounts CRUD (PostgreSQL)
- [ ] Add org-based scoping

### Phase 2: Telegram Integration (Day 3-4)
- [ ] Telegram bot client setup
- [ ] Webhook endpoint + signature validation
- [ ] Store messages in D1 via service
- [ ] Create/update conversations in D1
- [ ] Sync conversation metadata to PostgreSQL
- [ ] Send message via Bot API
- [ ] Message status tracking
- [ ] Test with real Telegram bot

### Phase 3: Message Management (Day 5)
- [ ] Query messages from D1 with pagination
- [ ] Conversation grouping and listing
- [ ] Message templates CRUD (PostgreSQL)
- [ ] Link messages to CRM entities (Lead/Contact)
- [ ] Search and filtering across D1 messages

### Phase 4: Real-Time (Day 6)
- [ ] WebSocket gateway setup
- [ ] Room-based broadcasting
- [ ] Frontend real-time message UI
- [ ] Typing indicators

### Phase 5: WhatsApp & Messenger (Day 7-8)
- [ ] WhatsApp integration (Meta Cloud API)
- [ ] Messenger integration
- [ ] Unified webhook handler abstraction
- [ ] Platform-specific message formatting

### Phase 6: CRM Integration (Day 9)
- [ ] Event-driven lead creation from conversations
- [ ] Auto-link messages to contacts
- [ ] Activity tracking for messages
- [ ] Dashboard widget for recent messages

---

## 11. D1 Service Implementation Pattern

```typescript
// apps/messaging-service/src/d1/d1.service.ts
import { Injectable, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class D1Service {
  private accountId: string;
  private databaseId: string;
  private apiToken: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    this.accountId = this.configService.get('CLOUDFLARE_ACCOUNT_ID');
    this.databaseId = this.configService.get('CLOUDFLARE_D1_DATABASE_ID');
    this.apiToken = this.configService.get('CLOUDFLARE_API_TOKEN');
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new HttpException(`D1 query failed: ${error}`, response.status);
    }

    const data = await response.json();
    return data.result[0].results || [];
  }

  async execute(sql: string, params: any[] = []): Promise<{ changes: number }> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new HttpException(`D1 execute failed: ${error}`, response.status);
    }

    const data = await response.json();
    return { changes: data.result[0].meta.changes };
  }

  async batch(queries: Array<{ sql: string; params?: any[] }>): Promise<any[]> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queries),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new HttpException(`D1 batch failed: ${error}`, response.status);
    }

    const data = await response.json();
    return data.result;
  }
}
```

---

## 11. Frontend Requirements

### New Pages/Components
```
/messaging
  /accounts              # List messaging accounts
  /accounts/new          # Add account (Telegram/WhatsApp/Messenger)
  /conversations         # Inbox view (like chat app)
  /conversations/:id     # Chat interface
  /templates             # Message templates
```

### Components
- `MessagingAccountCard` - Display account status
- `ConversationList` - Inbox sidebar
- `MessageThread` - Chat bubbles
- `MessageComposer` - Send message form
- `TemplateSelector` - Quick template insertion

---

## Next Steps

1. **Start Phase 1:** Create messaging-service app structure
2. **Define entities:** MessagingAccount, Message, Conversation, Template
3. **Set up authentication:** Share JWT strategy with main CRM app
4. **Implement Telegram:** Easiest platform to start with

Should I proceed with Phase 1 implementation?
