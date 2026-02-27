CREATE TABLE "tenants" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "created_at" timestamp
);

CREATE TABLE "users" (
  "tenant_id" uuid,
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "email" varchar,
  "avatar_url" varchar,
  "status" varchar,
  "created_at" timestamp
);

CREATE TABLE "conversations" (
  "tenant_id" uuid,
  "id" uuid PRIMARY KEY,
  "type" varchar,
  "title" varchar,
  "created_by" uuid,
  "created_at" timestamp
);

CREATE TABLE "participants" (
  "conversation_id" uuid,
  "user_id" uuid,
  "last_read_message_id" uuid,
  "last_delivered_message_id" uuid,
  PRIMARY KEY ("conversation_id", "user_id")
);

CREATE TABLE "messages" (
  "id" uuid PRIMARY KEY,
  "sender_id" uuid,
  "conversation_id" uuid,
  "content" text,
  "message_type" varchar,
  "delivered_at" timestamp,
  "read_at" timestamp,
  "created_at" timestamp,
  "deleted_at" timestamp
);

CREATE TABLE "attachments" (
  "id" uuid PRIMARY KEY,
  "message_id" uuid,
  "file_url" text,
  "file_type" varchar,
  "file_size" bigint,
  "duration" int
);

ALTER TABLE "users" ADD FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id");

ALTER TABLE "conversations" ADD FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id");

ALTER TABLE "participants" ADD FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id");

ALTER TABLE "participants" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "messages" ADD FOREIGN KEY ("sender_id") REFERENCES "users" ("id");

ALTER TABLE "messages" ADD FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id");

ALTER TABLE "attachments" ADD FOREIGN KEY ("message_id") REFERENCES "messages" ("id");
