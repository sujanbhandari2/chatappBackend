process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT ?? '4001';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/healthchat';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-test-secret-test-secret-123';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1d';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';
process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

import { prisma } from '../config/prisma';

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      attachments,
      messages,
      participants,
      conversations,
      users,
      tenants
    RESTART IDENTITY CASCADE
  `);
});

afterAll(async () => {
  await prisma.$disconnect();
});
