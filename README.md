# Backend

## Key Security Controls
- JWT includes `tenantId`, `role`, and `username`.
- REST auth middleware enforces token validity and seeds tenant context.
- Prisma query middleware auto-filters tenant-scoped models (`users`, `conversations`, `messages`).
- Chat services validate participation/admin rights before read/write actions.
- Socket handshake validates JWT and enforces tenant room scoping.

## Authentication Flow
- `POST /api/auth/register` with `{ username, password }` creates a user in the default tenant.
- `POST /api/auth/login` with `{ username, password }` returns a JWT token.
- Each authenticated user is auto-enrolled in the global conversation so messages can reach all registered users.
- Mobile push token APIs:
  - `POST /api/users/push-token` with `{ token, platform, deviceId? }`
  - `DELETE /api/users/push-token` with `{ token }`

## Tenant Isolation
- DB model includes `tenant_id` on tenant-scoped tables.
- `messages` has composite FK to `conversations (id, tenant_id)` and `users (id, tenant_id)`.
- Query middleware injects tenant filtering to block cross-tenant access.

## Run
```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

## FCM Push Setup
- Set backend env:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY` (service-account private key with `\n` escaped line breaks)
- If these are missing, backend safely skips push delivery and logs a warning.
