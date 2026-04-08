# Deployment prerequisites

What you need to run or deploy this backend. **Environment variable names and placeholders** live only in **`.env.example`** — copy it to `.env` and fill in values locally or in your platform’s secret store.

## Runtime and tooling

| Requirement | Notes |
|-------------|--------|
| **Node.js** | **20.x** (matches `Dockerfile` base image). |
| **npm** | Used for installs and scripts (`package.json`). |
| **PostgreSQL** | **16** recommended (same major as `docker-compose.yml`). The app uses Prisma; apply schema with migrations. |
| **Redis** | **7** recommended for Socket.IO scaling (`@socket.io/redis-adapter`) and related usage. |
| **OpenSSL** | Required on the host for Prisma/OpenSSL in some environments (Alpine image installs `openssl`). |

## Optional / feature-specific

| Component | When you need it |
|-----------|------------------|
| **Docker & Docker Compose** | To run the stack as defined in `docker-compose.yml` (app + Postgres + Redis). |
| **AWS S3 (or compatible)** | File uploads and presigned URLs when those features are enabled; set `AWS_*` variables. |
| **OpenAI / Gemini** | Transcription and translation when you use those APIs; set the corresponding keys and URLs/models. |

## Secrets and validation

- **`JWT_SECRET`**: Must be **at least 32 characters** (enforced in `src/config/env.ts`).
- **`DATABASE_URL`**: If omitted, the app builds a URL from `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`, and `POSTGRES_DB`.
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
   Set environment variables (or `.env`), run `npm ci`, `npm run db:generate`, `npm run build`, `npm run db:deploy` (migrations), then `npm start`. Ensure Postgres and Redis are reachable from the app.

3. **Optional seed data**  
   `npm run seed` (see `prisma/seed.ts`) — only if you intend to load initial data; not required for a minimal production boot.

For production, set `NODE_ENV=production`, use strong secrets, set `FRONTEND_ORIGIN` appropriately, and point database/Redis URLs at your real services.
