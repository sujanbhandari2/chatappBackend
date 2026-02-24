"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().default(4000),
    DATABASE_URL: zod_1.z.string().min(1),
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET should be at least 32 characters for production use'),
    JWT_EXPIRES_IN: zod_1.z.string().default('1d'),
    REDIS_URL: zod_1.z.string().default('redis://localhost:6379'),
    UPLOAD_DIR: zod_1.z.string().default('uploads'),
    FRONTEND_ORIGIN: zod_1.z.string().default('http://localhost:5173'),
    FIREBASE_PROJECT_ID: zod_1.z.string().default(''),
    FIREBASE_CLIENT_EMAIL: zod_1.z.string().default(''),
    FIREBASE_PRIVATE_KEY: zod_1.z.string().default('')
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}
exports.env = parsed.data;
