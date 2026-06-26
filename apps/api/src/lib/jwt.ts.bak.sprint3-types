import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UserRole } from '@prisma/client';

export type AuthTokenPayload = {
  sub: string;
  companyId: string;
  role: UserRole;
  email: string;
};

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}
