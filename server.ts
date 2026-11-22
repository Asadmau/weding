import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './backend/src/app.ts';
import { env } from './backend/src/config/env.ts';
import { initializeSchema } from './backend/src/db/schema.ts';
import { seedDatabase } from './backend/src/db/seed.ts';

async function bootstrap() {
  initializeSchema();
  await seedDatabase();

  const app = createApiApp();

  if (!env.isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`Wedding Invitation System running on http://0.0.0.0:${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
