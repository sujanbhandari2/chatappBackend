-- AlterTable
ALTER TABLE "attachments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "conversations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "messages" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "reactions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenants" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "audio_transcriptions_tenant_id_user_id_audio_content_sha256_lan" RENAME TO "audio_transcriptions_tenant_id_user_id_audio_content_sha256_key";
