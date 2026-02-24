import { Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import { signToken } from '../../utils/jwt';
import { comparePassword, hashPassword } from '../../utils/password';

interface RegisterInput {
  username: string;
  password: string;
}

interface LoginInput {
  username: string;
  password: string;
}

const DEFAULT_TENANT_NAME = 'Public Healthcare Chat';

const ensureDefaultTenant = async () => {
  const firstTenant = await prisma.tenant.findFirst({
    orderBy: { createdAt: 'asc' }
  });

  if (firstTenant) {
    return firstTenant;
  }

  return prisma.tenant.create({
    data: {
      name: DEFAULT_TENANT_NAME
    }
  });
};

const ensureUserInGlobalConversation = async (tenantId: string, userId: string): Promise<void> => {
  let globalConversation = await prisma.conversation.findFirst({
    where: {
      tenantId,
      isGlobal: true
    }
  });

  if (!globalConversation) {
    globalConversation = await prisma.conversation.create({
      data: {
        tenantId,
        isGlobal: true
      }
    });
  }

  await prisma.conversationParticipant.upsert({
    where: {
      conversationId_userId: {
        conversationId: globalConversation.id,
        userId
      }
    },
    create: {
      conversationId: globalConversation.id,
      userId
    },
    update: {}
  });
};

const formatAuthResponse = (user: {
  id: string;
  username: string;
  tenantId: string;
  role: Role;
}) => {
  const token = signToken({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    username: user.username
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      tenantId: user.tenantId,
      role: user.role
    }
  };
};

export const register = async (input: RegisterInput) => {
  const normalizedUsername = input.username.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: {
      username: normalizedUsername
    }
  });

  if (existingUser) {
    throw new ApiError(409, 'Username already exists');
  }

  const tenant = await ensureDefaultTenant();
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      role: 'CLIENT',
      username: normalizedUsername,
      email: `${normalizedUsername}@local.chat`,
      passwordHash
    },
    select: {
      id: true,
      username: true,
      tenantId: true,
      role: true
    }
  });

  await ensureUserInGlobalConversation(user.tenantId, user.id);

  return formatAuthResponse(user);
};

export const login = async (input: LoginInput) => {
  const normalizedUsername = input.username.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      username: normalizedUsername
    }
  });

  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isPasswordValid = await comparePassword(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  await ensureUserInGlobalConversation(user.tenantId, user.id);

  return formatAuthResponse({
    id: user.id,
    username: user.username,
    tenantId: user.tenantId,
    role: user.role
  });
};
