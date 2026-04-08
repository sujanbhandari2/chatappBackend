# Deployment prerequisites

This document lists what you need before deploying the chat backend, and the **environment variable layout** (mirrors `.env.example`). Copy `.env.example` to `.env` for local use, or inject the same keys from your platform’s secret store when hosted.

## Runtime and tooling

| Requirement | Notes |
|-------------|--------|
| **Node.js** | **20.x** (matches `Dockerfile` base image). |
| **npm** | Used for installs and scripts (`package.json`). |
| **PostgreSQL** | **18** recommended (**same major** as `docker-compose.yml`). The app uses Prisma; apply schema with migrations. **Hosted** dev/QA/production: use [Amazon RDS](https://aws.amazon.com/rds/) for PostgreSQL — see [Hosted database (AWS RDS)](#hosted-database-aws-rds). |
| **Redis** | **7** recommended for Socket.IO scaling (`@socket.io/redis-adapter`) and related usage. |
| **OpenSSL** | Required on the host for Prisma/OpenSSL in some environments (Alpine image installs `openssl`). |

## Hosted database (AWS RDS)

For **any environment that is not purely local** (dev, QA, or production in AWS or behind your CI/CD), **host PostgreSQL on Amazon RDS**:

- **Engine**: PostgreSQL **18** (match `docker-compose.yml` and RDS engine version for parity across environments).
- **Connection string**: set **`DATABASE_URL`** in secrets to the RDS endpoint Prisma expects, e.g.  
  `postgresql://USER:PASSWORD@RDS_ENDPOINT:5432/DATABASE?schema=public`  
  Add SSL query params if your RDS instance requires TLS (common in production), e.g. `?schema=public&sslmode=require` — follow AWS and Prisma docs for your setup.
- **Network**: place the app (ECS, EC2, Lambda with VPC, etc.) in subnets/security groups that can reach the RDS instance on port **5432**.
- **Migrations**: run `prisma migrate deploy` (as in the `Dockerfile` startup) against each RDS instance when promoting releases; do not point production traffic at a DB that has not had migrations applied.

Local development may keep using the Postgres service in **`docker-compose.yml`**; that path is **not** a substitute for RDS in hosted environments.

## Optional / feature-specific

| Component | When you need it |
|-----------|------------------|
| **Docker & Docker Compose** | Run the stack from `docker-compose.yml` (app + Postgres + Redis). Postgres in Compose is for **local use only**; hosted environments use **RDS** as above. |
| **AWS S3 (or compatible)** | File uploads and presigned URLs when those features are enabled; set `AWS_*` variables. |
| **OpenAI / Gemini** | Transcription and translation when you use those APIs; set the corresponding keys and URLs/models. |

## Secrets and validation

- **`JWT_SECRET`**: Must be **at least 32 characters** (enforced in `src/config/env.ts`).
- **`DATABASE_URL`**: For **hosted** deploys, set this to your **RDS** URL. If **omitted** (typical local dev), the app builds a URL from `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`, and `POSTGRES_DB`.
- **`REDIS_URL`**: If omitted, the app builds a URL from `REDIS_HOST`, `REDIS_PORT`, and optional `REDIS_PASSWORD`.

## `NODE_ENV` (runtime mode)

Standard Node values only (`src/config/env.ts`): **`development`**, **`test`** (e.g. Jest), **`production`**.  
This is **not** the same as git branches named `dev` / `qa` — those are **CI/CD** concerns; see `docs/CI_CD_ACCEPTANCE_CRITERIA.md`.

## CI/CD (summary)

- **Dev / QA deployments**: triggered by pushes to the **`dev`** and **`qa`** branches.
- **Production deployment**: triggered when a **version tag** is pushed (e.g. `v1.0.0`).

Details and acceptance criteria: `docs/CI_CD_ACCEPTANCE_CRITERIA.md`.

## Deploy paths (summary)

1. **Docker Compose**  
   Copy `.env.example` to `.env`, fill required values, then run `docker compose up --build`. The production image runs `prisma migrate deploy` before starting the server (`Dockerfile` `CMD`).

2. **Node on a VM / PaaS**  
   Set environment variables (or `.env`), run `npm ci`, `npm run db:generate`, `npm run build`, `npm run db:deploy` (migrations), then `npm start`. Use **RDS** for PostgreSQL and ensure Postgres and Redis are reachable from the app.

3. **Optional seed data**  
   `npm run seed` (see `prisma/seed.ts`) — only if you intend to load initial data; not required for a minimal production boot.

---

## Environment layout (`.env.example`)

Copy this structure into `.env` and replace placeholders. Values below match the repository’s **`.env.example`** file.

```env
NODE_ENV=development
PORT=4000

JWT_SECRET=change-me-use-at-least-32-characters-long-secret
JWT_EXPIRES_IN=1d

# Hosted dev/QA/prod: set to Amazon RDS PostgreSQL URL (often ?sslmode=require). Local: leave empty to use POSTGRES_* below.
DATABASE_URL=
POSTGRES_DB=chat
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_PORT=5432
POSTGRES_HOST=localhost

REDIS_URL=
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=password

UPLOAD_DIR=uploads

AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_S3_ENDPOINT=
AWS_S3_FORCE_PATH_STYLE=
AWS_S3_SIGNED_URL_TTL_SECONDS=300

FRONTEND_ORIGIN=http://localhost:5173

MESSAGE_ENCRYPTION_KEY=

TRANSCRIBE_API_KEY=
TRANSLATION_API_KEY=
OPENAI_TRANSCRIPTION_URL=https://api.openai.com/v1/audio/transcriptions
OPENAI_CHAT_COMPLETIONS_URL=https://api.openai.com/v1/chat/completions
OPENAI_TRANSLATION_MODEL=gpt-4o-mini
TRANSLATION_PROVIDER=openai
GEMINI_API_KEY=
GEMINI_TRANSLATION_MODEL=gemini-2.0-flash
```

For **production**, set `NODE_ENV=production`, use strong unique secrets, restrict `FRONTEND_ORIGIN` to your real web origin(s), point **`DATABASE_URL` at Amazon RDS**, and set `REDIS_URL` (or Redis host fields) to your managed Redis if applicable.
