import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api-error';

export const authorizeRoles = (...roles: Array<'CLIENT' | 'AGENT' | 'ADMIN'>) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ApiError(403, 'Forbidden for this role'));
      return;
    }

    next();
  };
};
