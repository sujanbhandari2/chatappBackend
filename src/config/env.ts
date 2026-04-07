import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET should be at least 32 characters for production use'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  REDIS_URL: z.string().optional(),
  POSTGRES_DB: z.string().default('healthcare_chat'),
  POSTGRES_USER: z.string().default('postgres'),
  POSTGRES_PASSWORD: z.string().default('postgres'),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_HOST: z.string().default('localhost'),
  REDIS_PASSWORD: z.string().default(''),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_HOST: z.string().default('localhost'),
  UPLOAD_DIR: z.string().default('uploads'),
  AWS_REGION: z.string().default(''),
  AWS_ACCESS_KEY_ID: z.string().default(''),
  AWS_SECRET_ACCESS_KEY: z.string().default(''),
  AWS_S3_BUCKET: z.string().default(''),
  /**
   * Custom S3 API URL — use when AWS returns "must be addressed using the specified endpoint"
   * (set to the regional endpoint URL from the error), or for MinIO/LocalStack (e.g. http://localhost:9000).
   */
  AWS_S3_ENDPOINT: z.string().default(''),
  /** Set true for MinIO and some S3-compatible APIs (path-style URLs). */
  AWS_S3_FORCE_PATH_STYLE: z
    .string()
    .default('')
    .transform((s) => /^(1|true|yes)$/i.test(s.trim())),
  AWS_S3_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(300),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  MESSAGE_ENCRYPTION_KEY: z.string().default(''),
  FIREBASE_PROJECT_ID: z.string().default(''),
  FIREBASE_CLIENT_EMAIL: z.string().default(''),
  FIREBASE_PRIVATE_KEY: z.string().default(''),
  /** Bearer token for OpenAI-compatible speech-to-text (Whisper) and optional text translation */
  OPENAI_API_KEY: z.string().default(''),
  OPENAI_TRANSCRIPTION_URL: z
    .string()
    .url()
    .default('https://api.openai.com/v1/audio/transcriptions'),
  OPENAI_CHAT_COMPLETIONS_URL: z
    .string()
    .url()
    .default('https://api.openai.com/v1/chat/completions'),
  OPENAI_TRANSLATION_MODEL: z.string().default('gpt-4o-mini'),
  /** Set to `gemini` to translate via Gemini REST; otherwise uses OpenAI chat completions */
  TRANSLATION_PROVIDER: z.enum(['openai', 'gemini']).default('openai'),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_TRANSLATION_MODEL: z.string().default('gemini-2.0-flash')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

const data = parsed.data;

const databaseUrl =
  data.DATABASE_URL ??
  `postgresql://${data.POSTGRES_USER}:${data.POSTGRES_PASSWORD}@${data.POSTGRES_HOST}:${data.POSTGRES_PORT}/${data.POSTGRES_DB}?schema=public`;

const redisAuthPrefix = data.REDIS_PASSWORD ? `:${data.REDIS_PASSWORD}@` : '';
const redisUrl = data.REDIS_URL ?? `redis://${redisAuthPrefix}${data.REDIS_HOST}:${data.REDIS_PORT}`;

export const env = {
  ...data,
  DATABASE_URL: databaseUrl,
  REDIS_URL: redisUrl
};
