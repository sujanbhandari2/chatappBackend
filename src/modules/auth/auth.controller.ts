import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
