CREATE TABLE "delivery_receipts" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "message_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "delivered_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "delivery_receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "delivery_receipts_message_id_user_id_key" ON "delivery_receipts"("message_id", "user_id");
CREATE INDEX "delivery_receipts_user_id_idx" ON "delivery_receipts"("user_id");

ALTER TABLE "delivery_receipts"
  ADD CONSTRAINT "delivery_receipts_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "messages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "delivery_receipts"
  ADD CONSTRAINT "delivery_receipts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
