ALTER TABLE "users"
  ADD COLUMN "username" TEXT;

WITH ranked AS (
  SELECT
    "id",
    regexp_replace(lower(split_part("email", '@', 1)), '[^a-z0-9_]+', '_', 'g') AS base_username,
    row_number() OVER (
      PARTITION BY regexp_replace(lower(split_part("email", '@', 1)), '[^a-z0-9_]+', '_', 'g')
      ORDER BY "id"
    ) AS seq
  FROM "users"
)
UPDATE "users" AS u
SET "username" = CASE WHEN r.seq = 1 THEN r.base_username ELSE r.base_username || '_' || r.seq END
FROM ranked AS r
WHERE u."id" = r."id";

ALTER TABLE "users"
  ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE INDEX "users_username_idx" ON "users"("username");

ALTER TABLE "conversations"
  ADD COLUMN "is_global" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "conversations_tenant_id_is_global_idx" ON "conversations"("tenant_id", "is_global");
