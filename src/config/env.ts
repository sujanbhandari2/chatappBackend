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
  AWS_S3_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(300),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  MESSAGE_ENCRYPTION_KEY: z.string().default(''),
  FIREBASE_PROJECT_ID: z.string().default(''),
  FIREBASE_CLIENT_EMAIL: z.string().default(''),
  FIREBASE_PRIVATE_KEY: z.string().default('')
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
