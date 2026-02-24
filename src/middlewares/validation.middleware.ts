import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../utils/api-error';

interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

export const validate = (schemas: ValidationSchemas) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        (req as any).body = schemas.body.parse(req.body);
      }

      if (schemas.params) {
        (req as any).params = schemas.params.parse(req.params);
      }

      if (schemas.query) {
        (req as any).query = schemas.query.parse(req.query);
      }

      next();
    } catch (error) {
      next(new ApiError(400, 'Validation failed', error));
    }
  };
};
