import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api-error';

export const authorizeStatuses = (...statuses: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }

    if (statuses.length > 0 && !statuses.includes(req.user.status)) {
      next(new ApiError(403, 'Forbidden for this user status'));
      return;
    }

    next();
  };
};
