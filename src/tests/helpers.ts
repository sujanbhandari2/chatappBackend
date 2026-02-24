import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { signToken } from '../utils/jwt';
import { hashPassword } from '../utils/password';

export const createTenant = async (name: string) => {
  return prisma.tenant.create({ data: { name } });
};

export const createUser = async (input: {
  tenantId: string;
  email: string;
  role: Role;
  password?: string;
}) => {
  const passwordHash = await hashPassword(input.password ?? 'Password123!');
  const baseUsername = input.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  const username = `${baseUsername}_${Math.random().toString(36).slice(2, 8)}`;

  return prisma.user.create({
    data: {
      tenantId: input.tenantId,
      username,
      email: input.email,
      role: input.role,
      passwordHash
    }
  });
};

export const createConversation = async (tenantId: string, participantIds: string[]) => {
  return prisma.conversation.create({
    data: {
      tenantId,
      participants: {
        createMany: {
          data: participantIds.map((userId) => ({ userId }))
        }
      }
    }
  });
};

export const signUserToken = (input: {
  userId: string;
  tenantId: string;
  role: Role;
  username: string;
}): string => {
  return signToken(input);
};
