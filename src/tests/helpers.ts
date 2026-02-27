import { prisma } from '../config/prisma';
import { signToken } from '../utils/jwt';

export const createTenant = async (name: string) => {
  return prisma.tenant.create({ data: { name } });
};

export const createUser = async (input: {
  tenantId: string;
  email: string;
  name?: string;
  status?: string;
}) => {
  const name = input.name ?? input.email.split('@')[0];

  return prisma.user.create({
    data: {
      tenantId: input.tenantId,
      name,
      email: input.email,
      status: input.status ?? 'ACTIVE'
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
  name: string;
  email: string;
  status?: string;
}): string => {
  return signToken(input);
};
