CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID', 'WEB');

CREATE TABLE "user_push_tokens" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "platform" "DevicePlatform" NOT NULL,
  "device_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_push_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_push_tokens_token_key" ON "user_push_tokens"("token");
CREATE INDEX "user_push_tokens_tenant_id_user_id_idx" ON "user_push_tokens"("tenant_id", "user_id");

ALTER TABLE "user_push_tokens"
  ADD CONSTRAINT "user_push_tokens_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_push_tokens"
  ADD CONSTRAINT "user_push_tokens_user_id_tenant_id_fkey"
  FOREIGN KEY ("user_id", "tenant_id") REFERENCES "users"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;
