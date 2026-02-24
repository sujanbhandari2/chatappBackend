import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../utils/api-error';
import { runWithTenantContext } from '../utils/tenant-context';

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

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req.headers.authorization);
    const payload = verifyToken(token);

    req.user = {
      id: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
      username: payload.username
    };

    req.prisma = prisma;

    runWithTenantContext(
      {
        tenantId: payload.tenantId,
        userId: payload.userId,
        role: payload.role
      },
      () => next()
    );
  } catch (error) {
    next(error);
  }
};
