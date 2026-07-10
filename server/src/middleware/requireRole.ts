import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return next(new AppError(403, 'Not authorized for this action'));
    }
    next();
  };
}
