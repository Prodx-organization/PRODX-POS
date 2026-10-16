import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'path';
import { createProductionApp } from './server/entrypoint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const port = 3000;

  // Create the production Express app (the backend)
  // We pass undefined for vercelOidcToken for local dev
  const { app: backendApp } = await createProductionApp();

  const app = express();

  if (!isProd) {
    // Create Vite server in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    // Mount the backend API routes on the same express app
    // The backendApp already has /api routes configured
    app.use(backendApp);

    // Use vite's connect instance as middleware
    app.use(vite.middlewares);

    // Serve index.html for all non-API routes (SPA fallback)
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const fs = await import('node:fs/promises');
        const html = await fs.readFile(resolve(__dirname, 'index.html'), 'utf-8');
        const template = await vite.transformIndexHtml(url, html);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Production mode
    app.use(backendApp);
    app.use(express.static(resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`PRODX POS (Full-Stack) running at http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
