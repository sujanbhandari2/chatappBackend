CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "tenants" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
  "tenant_id" TEXT NOT NULL,
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT,
  "email" TEXT NOT NULL,
  "avatar_url" TEXT,
  "status" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversations" (
  "tenant_id" TEXT NOT NULL,
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "type" TEXT,
  "title" TEXT,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "participants" (
  "conversation_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "last_read_message_id" TEXT,
  "last_delivered_message_id" TEXT,
  CONSTRAINT "participants_pkey" PRIMARY KEY ("conversation_id", "user_id")
);

CREATE TABLE "messages" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "sender_id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "message_type" TEXT NOT NULL,
  "delivered_at" TIMESTAMP(3),
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attachments" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "message_id" TEXT NOT NULL,
  "file_url" TEXT NOT NULL,
  "file_type" TEXT NOT NULL,
  "file_size" BIGINT NOT NULL,
  "duration" INTEGER,
  CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "conversations_tenant_id_idx" ON "conversations"("tenant_id");
CREATE INDEX "participants_user_id_idx" ON "participants"("user_id");
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");
CREATE INDEX "messages_deleted_at_idx" ON "messages"("deleted_at");
CREATE INDEX "attachments_message_id_idx" ON "attachments"("message_id");

ALTER TABLE "users"
  ADD CONSTRAINT "users_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "participants"
  ADD CONSTRAINT "participants_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "participants"
  ADD CONSTRAINT "participants_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_sender_id_fkey"
  FOREIGN KEY ("sender_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "participants"
  ADD CONSTRAINT "participants_last_read_message_id_fkey"
  FOREIGN KEY ("last_read_message_id") REFERENCES "messages"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "participants"
  ADD CONSTRAINT "participants_last_delivered_message_id_fkey"
  FOREIGN KEY ("last_delivered_message_id") REFERENCES "messages"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "attachments"
  ADD CONSTRAINT "attachments_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "messages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
