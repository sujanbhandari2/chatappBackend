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
      requesterId: req.user.id,
      role: req.user.role
    });

    res.status(200).json({ data: users });
  } catch (error) {
    next(error);
  }
};

export const registerPushToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const result = await usersService.registerPushToken({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      token: req.body.token,
      platform: req.body.platform,
      deviceId: req.body.deviceId
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const unregisterPushToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const result = await usersService.unregisterPushToken({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      token: req.body.token
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const testPush = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const result = await usersService.sendTestPush({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      message: req.body.message
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
