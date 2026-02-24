import { PrismaClient } from '@prisma/client';

export interface AuthUser {
  id: string;
  tenantId: string;
  role: 'CLIENT' | 'AGENT' | 'ADMIN';
  username: string;
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
