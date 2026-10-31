import express, { type ErrorRequestHandler } from 'express';
import { sanitizeAlertEvent, type TmlEvent } from '@tmlog/core';
import { createRequestContext, type RequestContext } from './context';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAlertEvent(value: unknown): value is TmlEvent {
  if (!isRecord(value)) {
    return false;
  }
  if (value.version !== 1 || value.type !== 'alert' || value.level !== 'error') {
    return false;
  }
  if (typeof value.timestamp !== 'number' || !Number.isFinite(value.timestamp)) {
    return false;
  }
  if (typeof value.scope !== 'string' || value.scope.length === 0 || typeof value.message !== 'string') {
    return false;
  }
  if (!isRecord(value.runtime)) {
    return false;
  }
  return typeof value.runtime.type === 'string';
}

export function createApi(development: boolean, consoleOutput = true) {
  const router = express.Router();
  router.use((req, res, next) => {
    const context = createRequestContext(development, consoleOutput);
    res.locals.context = context;
    res.setHeader('X-Request-ID', context.requestId);
    res.setHeader('Cache-Control', 'no-store');
    context.logger.info('demo.server.request', 'API request received', {
      requestId: context.requestId,
      method: req.method,
      path: req.path,
    });
    next();
  });
  router.use(express.json({ limit: '64kb' }));

  router.get('/demo', (req, res) => {
    const context = res.locals.context as RequestContext;
    if (req.query.fail === '1') {
      context.logger.error('demo.server.api', 'Simulated API failure', { requestId: context.requestId });
      res.status(500).json({ requestId: context.requestId, message: 'An intentional failure. Your app is still running.' });
      return;
    }
    context.logger.debug('demo.server.api', 'Loading synthetic data', { requestId: context.requestId });
    context.logger.info('demo.server.api', 'API request complete', { requestId: context.requestId });
    res.json({ requestId: context.requestId, message: 'Hello from the Express server.' });
  });

  router.post('/alerts', (req, res) => {
    const context = res.locals.context as RequestContext;
    if (!isAlertEvent(req.body)) {
      res.status(400).json({ requestId: context.requestId, message: 'Expected a version 1 TML alert event.' });
      return;
    }
    if (req.query.fail === '1') {
      context.logger.warn('demo.server.alert', 'Simulated alert delivery failure', { requestId: context.requestId });
      res.status(503).json({ requestId: context.requestId, message: 'The demo alert service is temporarily unavailable.' });
      return;
    }
    const receipt = sanitizeAlertEvent(req.body);
    context.logger.info('demo.server.alert', 'Sanitized alert received', { requestId: context.requestId });
    res.json({ requestId: context.requestId, receipt });
  });

  const handleJsonError: ErrorRequestHandler = (error, _req, res, next) => {
    if (error.type === 'entity.too.large') {
      res.status(413).json({ requestId: res.locals.context.requestId, message: 'Alert payload exceeds 64 KB.' });
      return;
    }
    if (error.type === 'entity.parse.failed') {
      res.status(400).json({ requestId: res.locals.context.requestId, message: 'Invalid JSON payload.' });
      return;
    }
    next(error);
  };
  router.use(handleJsonError);
  router.use((_req, res) => {
    res.status(404).json({ requestId: res.locals.context.requestId, message: 'Unknown demo API route.' });
  });
  return router;
}
