import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { verifyToken } from '../utils/jwt';
import { runWithTenantContext } from '../utils/tenant-context';
import { resolveAuthIdentity, syncAuthIdentity } from '../services/auth-identity-sync.service';
import { ApiError } from '../utils/api-error';

const extractToken = (authorizationHeader?: string): string => {
  if (!authorizationHeader) {
    throw new ApiError(401, 'Missing authorization header');
  }

  const [prefix, token] = authorizationHeader.split(' ');

  if (prefix !== 'Bearer' || !token) {
    throw new ApiError(401, 'Invalid authorization header');
  }

  return token;
};

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractToken(req.headers.authorization);
    const payload = verifyToken(token);
    const identity = resolveAuthIdentity(payload);
    await syncAuthIdentity(identity);

    req.user = {
      id: identity.userId,
      tenantId: identity.tenantId,
      name: identity.name,
      email: identity.email,
      status: identity.status
    };

    req.prisma = prisma;

    runWithTenantContext(
      {
        tenantId: identity.tenantId,
        userId: identity.userId
      },
      () => next()
    );
  } catch (error) {
    next(error);
  }
};
