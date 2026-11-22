import fs from 'node:fs';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.ts';
import { apiRateLimiter } from './middlewares/rateLimiter.ts';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.ts';
import { adminRouter } from './modules/admin/routes.ts';
import { authRouter } from './modules/auth/routes.ts';
import { publicRouter } from './modules/public/routes.ts';

export function createApiApp() {
  const app = express();

  app.set('trust proxy', 1);

  // Configure Helmet compatible with AI Studio preview iframe
  app.use(
    helmet({
      frameguard: false,
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  if (!fs.existsSync(env.uploadDir)) {
    fs.mkdirSync(env.uploadDir, { recursive: true });
  }
  app.use('/uploads', express.static(env.uploadDir, { maxAge: '7d' }));

  app.use('/api/v1', apiRateLimiter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1', publicRouter);

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}
