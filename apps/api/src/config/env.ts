import dotenv from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

const normalizedCwd = process.cwd().replace(/\\/g, '/');
const envPath = normalizedCwd.endsWith('/apps/api')
  ? path.resolve(process.cwd(), '../../.env')
  : path.resolve(process.cwd(), '.env');

dotenv.config({ path: envPath });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(20),
  JWT_EXPIRES_IN: z.string().default('8h'),
  COOKIE_NAME: z.string().default('duartefilms_token'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().default(5)
});

export const env = envSchema.parse(process.env);
