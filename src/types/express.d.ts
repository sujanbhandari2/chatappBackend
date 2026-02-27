import { PrismaClient } from '@prisma/client';

export interface AuthUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  status: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      prisma?: PrismaClient;
    }
  }
}

export {};
