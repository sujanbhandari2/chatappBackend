# Backend

## Key Security Controls
- JWT includes `tenantId`, `role`, and `username`.
- REST auth middleware enforces token validity and seeds tenant context.
- Prisma query middleware auto-filters tenant-scoped models (`users`, `conversations`, `messages`).
- Chat services validate participation/admin rights before read/write actions.
- Socket handshake validates JWT and enforces tenant room scoping.
- Message content is encrypted at rest on the server (AES-256-GCM) before DB write and decrypted on API/socket read.

## Authentication Flow
- `POST /api/auth/register` with `{ username, password }` creates a user in the default tenant.
- `POST /api/auth/login` with `{ username, password }` returns a JWT token.
- Each authenticated user is auto-enrolled in the global conversation so messages can reach all registered users.

## Tenant Isolation
- DB model includes `tenant_id` on tenant-scoped tables.
- `messages` has composite FK to `conversations (id, tenant_id)` and `users (id, tenant_id)`.
- Query middleware injects tenant filtering to block cross-tenant access.

## Prerequisites

- **Node.js 20.x**
- **npm**
- **PostgreSQL** (15+ recommended)
- **Redis** (for Socket.IO when `NODE_ENV` is not `test`)
- **Git**
- Optional: **Docker** and **Docker Compose** (`docker-compose.yml` for app + Postgres + Redis)
- Optional: **S3-compatible storage** and AI provider keys for uploads / speech / translation (see `.env.example`)

## Run
```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run seed
npm run dev
```

## Server-Side Message Encryption
- Set `MESSAGE_ENCRYPTION_KEY` in env for a dedicated encryption key.
- If `MESSAGE_ENCRYPTION_KEY` is not set, the backend derives encryption key material from `JWT_SECRET` to keep encryption active.
- Existing plaintext rows remain readable; newly sent messages are stored encrypted with `enc:v1:` payload format.

## Speech & translation (optional)
- `TRANSCRIBE_API_KEY` — OpenAI-compatible API key for audio transcription (Whisper).
- `TRANSLATION_API_KEY` — OpenAI-compatible API key when `TRANSLATION_PROVIDER=openai`.
- `GEMINI_API_KEY` — Google AI key when `TRANSLATION_PROVIDER=gemini`.
