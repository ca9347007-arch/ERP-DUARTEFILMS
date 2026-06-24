import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { env } from '../config/env.js';
import { verifyAuthToken } from '../lib/jwt.js';
import { AppError } from './errorHandler.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.[env.COOKIE_NAME];
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice('Bearer '.length)
    : undefined;
  const token = cookieToken || bearer;

  if (!token) throw new AppError(401, 'Autenticação obrigatória.');

  try {
    const payload = verifyAuthToken(token);
    req.auth = {
      userId: payload.sub,
      companyId: payload.companyId,
      role: payload.role,
      email: payload.email
    };
    next();
  } catch {
    throw new AppError(401, 'Sessão inválida ou expirada.');
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw new AppError(401, 'Autenticação obrigatória.');
    if (!roles.includes(req.auth.role)) throw new AppError(403, 'Permissão insuficiente.');
    next();
  };
}
