import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createTml } from '../src/index.ts';

let stored;
let storage;

beforeEach(() => {
  stored = new Map();
  storage = {
    getItem: vi.fn((key) => stored.get(key) ?? null),
    setItem: vi.fn((key, value) => stored.set(key, value)),
  };
  vi.stubGlobal('window', { localStorage: storage });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('restores saved watches for logging and replay after recreating a browser logger', () => {
  const output = vi.spyOn(console, 'log').mockImplementation(() => {});
  const logger = createTml();
  logger.watch('api.*');
  logger.watch('api.*');
  expect(JSON.parse(stored.get('tmlog.watches'))).toEqual(['api.*']);

  const reloaded = createTml();
  reloaded.log('db.query', 'hidden');
  reloaded.log('api.request', 'restored');
  reloaded.replay([
    { version: 1, timestamp: 1, scope: 'api.server', type: 'log', message: 'replayed', runtime: { type: 'node' } },
  ]);
  expect(output.mock.calls).toEqual([
    ['[api.request]', 'restored'],
    ['[api.server]', 'replayed'],
  ]);
});

test('persists unwatch and watch cleanup without removing other patterns', () => {
  const output = vi.spyOn(console, 'log').mockImplementation(() => {});
  const logger = createTml();
  const stop = logger.watch('api.*');
  logger.watch('db.*');
  logger.unwatch('db.*');

  createTml().log('db.query', 'removed');
  createTml().log('api.request', 'still watched');
  expect(output).toHaveBeenCalledExactlyOnceWith('[api.request]', 'still watched');

  stop();
  stop();
  expect(JSON.parse(stored.get('tmlog.watches'))).toEqual([]);
  createTml().log('api.request', 'removed by cleanup');
  expect(output).toHaveBeenCalledTimes(1);
});

test.each(['invalid JSON', '{}', 'null', '42', '"api.*"'])('ignores invalid stored watches: %s', (value) => {
  stored.set('tmlog.watches', value);
  const output = vi.spyOn(console, 'log').mockImplementation(() => {});
  const logger = createTml();
  logger.log('api.request', 'hidden');
  expect(output).not.toHaveBeenCalled();
  logger.watch('api.*');
  expect(JSON.parse(stored.get('tmlog.watches'))).toEqual(['api.*']);
});

test('ignores invalid entries while restoring valid patterns', () => {
  stored.set('tmlog.watches', JSON.stringify([null, 123, {}, '', 'api.*']));
  const output = vi.spyOn(console, 'log').mockImplementation(() => {});
  const logger = createTml();
  logger.log('api.request', 'restored');
  expect(output).toHaveBeenCalledExactlyOnceWith('[api.request]', 'restored');
});

test.each(['access', 'read', 'write'])('keeps watch controls working when storage fails on %s', (failure) => {
  const unavailable = () => {
    throw new Error('Storage unavailable');
  };
  if (failure === 'access') {
    Object.defineProperty(window, 'localStorage', { get: unavailable });
  }
  if (failure === 'read') {
    storage.getItem.mockImplementation(unavailable);
  }
  if (failure === 'write') {
    storage.setItem.mockImplementation(unavailable);
  }

  const output = vi.spyOn(console, 'log').mockImplementation(() => {});
  const logger = createTml();
  const stop = logger.watch('api.*');
  logger.log('api.request', 'shown');
  stop();
  logger.log('api.request', 'hidden');
  logger.watch('api.*');
  logger.unwatch('api.*');
  logger.log('api.request', 'hidden again');
  expect(output).toHaveBeenCalledExactlyOnceWith('[api.request]', 'shown');
});

test('does not access storage during server-side rendering', () => {
  vi.stubGlobal('window', undefined);
  vi.stubGlobal('localStorage', storage);
  const logger = createTml();
  const stop = logger.watch('api.*');
  stop();
  logger.unwatch('api.*');
  expect(storage.getItem).not.toHaveBeenCalled();
  expect(storage.setItem).not.toHaveBeenCalled();
});
