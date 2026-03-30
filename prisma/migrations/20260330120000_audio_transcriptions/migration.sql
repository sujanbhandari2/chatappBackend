-- CreateTable
CREATE TABLE "audio_transcriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "audio_content_sha256" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT '',
    "transcript_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_transcriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audio_transcriptions_tenant_id_user_id_audio_content_sha256_language_key" ON "audio_transcriptions"("tenant_id", "user_id", "audio_content_sha256", "language");

-- CreateIndex
CREATE INDEX "audio_transcriptions_tenant_id_user_id_idx" ON "audio_transcriptions"("tenant_id", "user_id");

-- AddForeignKey
ALTER TABLE "audio_transcriptions" ADD CONSTRAINT "audio_transcriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_transcriptions" ADD CONSTRAINT "audio_transcriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
