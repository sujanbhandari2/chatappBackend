import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../../utils/api-error';
import * as usersService from './users.service';

export const listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const users = await usersService.listUsers({
      tenantId: req.user.tenantId,
      requesterId: req.user.id
    });

    res.status(200).json({ data: users });
  } catch (error) {
    next(error);
  }
};
