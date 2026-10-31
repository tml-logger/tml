import { afterEach, describe, expect, test } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApi } from '../server/api';
import { createRequestContext, diagnostics } from '../server/context';
import { serializeBootstrap } from '../server/serialize';
import { render } from '../src/entry-server';
import type { ApiResult } from '../src/shared';

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  })));
});

async function start(development = true): Promise<string> {
  const app = express();
  app.use('/api', createApi(development, false));
  const server = app.listen(0, '127.0.0.1');
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

function alertEvent() {
  return {
    version: 1, timestamp: Date.now(), type: 'alert', level: 'error',
    scope: 'demo.client.alert', message: 'Synthetic alert', runtime: { type: 'browser' },
    data: { password: 'plain-secret', nested: { accessToken: 'token-secret' }, safe: 'keep' },
  };
}

test('SSR renders meaningful HTML without running browser initialization', () => {
  const html = render({ requestId: 'ssr-request', generatedAt: '2026-10-18T12:00:00.000Z', message: 'Server data', development: true });
  expect(html).toContain('Tiny micro logger demo');
  expect(html).toContain('ssr-request');
  expect(html).toContain('Server rendered');
  expect(html).toContain('Server data');
});

test('bootstrap JSON cannot terminate its script and round-trips special characters', () => {
  const value = { message: '</script><script>alert(1)</script>&\u2028\u2029', requestId: '$&' };
  const serialized = serializeBootstrap(value);
  expect(serialized).not.toContain('<');
  expect(serialized).not.toContain('&');
  expect(JSON.parse(serialized)).toEqual(value);
});

test('request buffers are bounded and exported snapshots are sanitized', () => {
  const context = createRequestContext(true, false);
  for (let index = 0; index < 105; index += 1) {
    context.logger.warn('demo.server.test', 'event', { requestId: context.requestId, index, password: 'secret' });
  }
  const logs = diagnostics(context).logs ?? [];
  expect(logs).toHaveLength(100);
  expect(logs[0]?.data).toEqual({ requestId: context.requestId, index: 5, password: '[REDACTED]' });
});

test('concurrent API requests receive isolated IDs without logs', async () => {
  const base = await start();
  const responses = await Promise.all(Array.from({ length: 5 }, () => fetch(`${base}/api/demo`)));
  const results: ApiResult[] = await Promise.all(responses.map((response) => response.json()));
  expect(new Set(results.map((result) => result.requestId)).size).toBe(5);
  for (const result of results) {
    expect(result).not.toHaveProperty('logs');
    expect(Object.keys(result).sort()).toEqual(['message', 'requestId']);
  }
});

test('intentional API errors retain their status and request ID without logs', async () => {
  const base = await start();
  const response = await fetch(`${base}/api/demo?fail=1`);
  const result = await response.json() as ApiResult;
  expect(response.status).toBe(500);
  expect(result.requestId).toBe(response.headers.get('x-request-id'));
  expect(result).not.toHaveProperty('logs');
  expect(Object.keys(result).sort()).toEqual(['message', 'requestId']);
});

test('production API responses omit diagnostics for success and failure', async () => {
  const base = await start(false);
  for (const query of ['', '?fail=1']) {
    const result = await (await fetch(`${base}/api/demo${query}`)).json();
    expect(result).not.toHaveProperty('logs');
  }
});

describe('alert receiver', () => {
  test('redacts an incoming payload again before returning the receipt', async () => {
    const base = await start();
    const response = await fetch(`${base}/api/alerts`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(alertEvent()) });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.receipt.data).toEqual({ password: '[REDACTED]', nested: { accessToken: '[REDACTED]' }, safe: 'keep' });
  });

  test.each([
    { body: '{}', status: 400 },
    { body: '{', status: 400 },
    { body: JSON.stringify({ ...alertEvent(), data: 'x'.repeat(70_000) }), status: 413 },
  ])('rejects invalid payloads with HTTP $status', async ({ body, status }) => {
    const base = await start();
    const response = await fetch(`${base}/api/alerts`, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    expect(response.status).toBe(status);
  });

  test('simulates a delivery failure', async () => {
    const base = await start();
    const response = await fetch(`${base}/api/alerts?fail=1`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(alertEvent()) });
    expect(response.status).toBe(503);
    expect(await response.json()).not.toHaveProperty('receipt');
  });
});
