import { Router } from 'express';
import { UserStatus } from '@prisma/client';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { audit } from '../../lib/audit.js';
import { signAuthToken } from '../../lib/jwt.js';
import { verifyPassword } from '../../lib/password.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { loginRateLimit } from '../../middlewares/rateLimits.js';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

authRouter.post('/login', loginRateLimit, asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || user.status !== UserStatus.ACTIVE) throw new AppError(401, 'E-mail ou senha inválidos.');

  const passwordOk = await verifyPassword(data.password, user.passwordHash);
  if (!passwordOk) throw new AppError(401, 'E-mail ou senha inválidos.');

  const token = signAuthToken({
    sub: user.id,
    companyId: user.companyId,
    role: user.role,
    email: user.email
  });

  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 8 * 60 * 60 * 1000
  });

  await audit({
    companyId: user.companyId,
    userId: user.id,
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
    ip: req.ip
  });

  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
}));

authRouter.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  res.clearCookie(env.COOKIE_NAME);
  if (req.auth) {
    await audit({ companyId: req.auth.companyId, userId: req.auth.userId, action: 'LOGOUT', entity: 'User', entityId: req.auth.userId, ip: req.ip });
  }
  res.json({ ok: true });
}));

authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    select: { id: true, name: true, email: true, role: true, company: { select: { name: true } } }
  });
  if (!user) throw new AppError(404, 'Usuário não encontrado.');
  res.json({ user });
}));
