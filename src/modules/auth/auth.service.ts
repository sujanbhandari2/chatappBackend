import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import { signToken } from '../../utils/jwt';

interface RegisterInput {
  tenantId?: string;
  name: string;
  email: string;
  status?: string;
}

interface LoginInput {
  tenantId: string;
  email: string;
}

const DEFAULT_TENANT_NAME = 'Public Chat';

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

const ensureTenant = async (tenantId?: string) => {
  if (!tenantId) {
    return ensureDefaultTenant();
  }

  return prisma.tenant.upsert({
    where: { id: tenantId },
    create: {
      id: tenantId,
      name: `Tenant ${tenantId}`
    },
    update: {}
  });
};

const formatAuthResponse = (user: {
  id: string;
  tenantId: string;
  name: string | null;
  email: string;
  status: string | null;
}) => {
  const token = signToken({
    userId: user.id,
    tenantId: user.tenantId,
    name: user.name ?? 'Anonymous',
    email: user.email,
    status: user.status ?? 'ACTIVE'
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      tenantId: user.tenantId,
      status: user.status
    }
  };
};

export const create = async (input: RegisterInput) => {
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedName = input.name.trim();
  const normalizedStatus = input.status?.trim() || 'ACTIVE';

  const tenant = await ensureTenant(input.tenantId);
  const existingUser = await prisma.user.findFirst({
    where: {
      tenantId: tenant.id,
      email: normalizedEmail
    },
    select: { id: true }
  });

  if (existingUser) {
    throw new ApiError(409, 'Email already exists in tenant');
  }

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: normalizedName,
      email: normalizedEmail,
      status: normalizedStatus
    },
    select: {
      id: true,
      tenantId: true,
      name: true,
      email: true,
      status: true
    }
  });

  return formatAuthResponse(user);
};

export const login = async (input: LoginInput) => {
  const normalizedEmail = input.email.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      tenantId: input.tenantId,
      email: normalizedEmail
    },
    select: {
      id: true,
      tenantId: true,
      name: true,
      email: true,
      status: true
    }
  });

  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  return formatAuthResponse(user);
};