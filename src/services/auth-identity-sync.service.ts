import { prisma } from '../config/prisma';
import { ApiError } from '../utils/api-error';
import { JwtPayload } from '../utils/jwt';

export interface ResolvedAuthIdentity {
  userId: string;
  tenantId: string;
  name: string;
  email: string;
  status: string;
}

const resolveStringClaim = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

export const resolveAuthIdentity = (payload: JwtPayload): ResolvedAuthIdentity => {
  const userId = resolveStringClaim(payload.userId) ?? resolveStringClaim(payload.sub);
  const tenantId = resolveStringClaim(payload.tenantId);

  if (!userId) {
    throw new ApiError(401, 'Invalid token payload: missing userId/sub');
  }

  if (!tenantId) {
    throw new ApiError(401, 'Invalid token payload: missing tenantId');
  }

  const name = resolveStringClaim(payload.name) ?? `user_${userId.slice(0, 8)}`;
  const email = (resolveStringClaim(payload.email) ?? `${userId}@external.local`).toLowerCase();
  const status = resolveStringClaim(payload.status) ?? 'ACTIVE';

  return {
    userId,
    tenantId,
    name,
    email,
    status
  };
};

export const syncAuthIdentity = async (identity: ResolvedAuthIdentity): Promise<void> => {
  await prisma.tenant.upsert({
    where: {
      id: identity.tenantId
    },
    create: {
      id: identity.tenantId,
      name: `External Tenant ${identity.tenantId}`
    },
    update: {}
  });

  const existingUser = await prisma.user.findUnique({
    where: { id: identity.userId },
    select: { tenantId: true }
  });

  if (existingUser && existingUser.tenantId !== identity.tenantId) {
    throw new ApiError(403, 'Token tenantId mismatch for existing user');
  }

  await prisma.user.upsert({
    where: {
      id: identity.userId
    },
    create: {
      id: identity.userId,
      tenantId: identity.tenantId,
      name: identity.name,
      email: identity.email,
      status: identity.status
    },
    update: {
      name: identity.name,
      email: identity.email,
      status: identity.status
    }
  });
};
