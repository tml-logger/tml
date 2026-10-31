import express, { type ErrorRequestHandler } from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import { render as renderProduction } from '../src/entry-server';
import type { InitialData } from '../src/shared';
import { createApi } from './api';
import { createRequestContext, diagnostics } from './context';
import { serializeBootstrap } from './serialize';

export async function createDemoServer(development: boolean, root = process.cwd()) {
  const app = express();
  let vite: ViteDevServer | undefined;
  app.use('/api', createApi(development));

  if (development) {
    const { createServer } = await import('vite');
    vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
    app.use(vite.middlewares);
  }
  if (!development) {
    app.use(express.static(path.join(root, 'dist/client'), { index: false }));
  }

  app.get('/', async (req, res) => {
    const context = createRequestContext(development);
    res.setHeader('X-Request-ID', context.requestId);
    res.setHeader('Cache-Control', 'no-store');
    context.logger.info('demo.server.ssr', 'Server rendering started', { requestId: context.requestId });
    const initial: InitialData = {
      requestId: context.requestId,
      generatedAt: new Date().toISOString(),
      message: 'This page was rendered on the server.',
      development,
    };
    let templatePath = path.join(root, 'dist/client/index.html');
    if (development) {
      templatePath = path.join(root, 'index.html');
    }
    let template = await readFile(templatePath, 'utf8');
    let render = renderProduction;
    if (vite) {
      template = await vite.transformIndexHtml(req.originalUrl, template);
      const serverModule = await vite.ssrLoadModule('/src/entry-server.tsx');
      render = serverModule.render;
    }
    const html = render(initial);
    context.logger.info('demo.server.ssr', 'Server rendering complete', { requestId: context.requestId });
    const bootstrap = { ...initial, ...diagnostics(context) };
    const document = template
      .replace('<!--app-html-->', () => html)
      .replace('<!--bootstrap-data-->', () => serializeBootstrap(bootstrap));
    res.type('html').send(document);
  });

  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    const context = createRequestContext(development);
    context.logger.error('demo.server.error', 'Request failed', { requestId: context.requestId, error: String(error) });
    res.status(500).type('text').send(`Unable to complete the request. Reference: ${context.requestId}`);
  };
  app.use(handleError);
  return { app, close: async () => { await vite?.close(); } };
}
