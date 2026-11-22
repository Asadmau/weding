import crypto from 'node:crypto';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DB_PATH: z.string().min(1).default('./data/wedding.db'),
  UPLOAD_DIR: z.string().min(1).default('./uploads'),
  SESSION_SECRET: z.string().optional(),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(24),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  APP_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Environment validation failed');
}

const rawSessionSecret = parsed.data.SESSION_SECRET?.trim();
const sessionKeyBytes = rawSessionSecret
  ? crypto.createHash('sha256').update(rawSessionSecret).digest()
  : crypto.randomBytes(32);

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
  port: parsed.data.PORT,
  dbPath:
    parsed.data.DB_PATH === ':memory:'
      ? ':memory:'
      : path.resolve(process.cwd(), parsed.data.DB_PATH),
  uploadDir: path.resolve(process.cwd(), parsed.data.UPLOAD_DIR),
  sessionKey: sessionKeyBytes,
  sessionTtlHours: parsed.data.SESSION_TTL_HOURS,
  adminEmail: parsed.data.ADMIN_EMAIL?.trim() || '',
  adminPassword: parsed.data.ADMIN_PASSWORD?.trim() || '',
  appUrl: parsed.data.APP_URL?.trim() || '',
};
