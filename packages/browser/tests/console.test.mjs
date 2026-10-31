import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import tml, { createTml, installConsole } from '../src/index.ts';

const cleanups = [];

beforeEach(() => {
  vi.stubGlobal('window', globalThis);
});

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    cleanup();
  }
  tml.unwatch('api.*');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('console controls watch and unwatch the default application logger', () => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  cleanups.push(installConsole());

  tml.log('api.request', 'hidden');
  expect(log).not.toHaveBeenCalled();
  globalThis.tml.watch('api.*');
  tml.log('api.request', 'shown');
  expect(log).toHaveBeenCalledExactlyOnceWith('[api.request]', 'shown');
  globalThis.tml.unwatch('api.*');
  tml.log('api.request', 'hidden again');
  expect(log).toHaveBeenCalledTimes(1);
});

test('custom console controls affect only the supplied logger and preserve watch disposal', () => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const logger = createTml();
  cleanups.push(installConsole(logger, { name: 'appLogs' }));

  const stop = globalThis.appLogs.watch('api.*');
  logger.log('api.request', 'custom logger');
  tml.log('api.request', 'default logger stays silent');
  expect(log).toHaveBeenCalledExactlyOnceWith('[api.request]', 'custom logger');
  stop();
  logger.log('api.request', 'stopped');
  expect(log).toHaveBeenCalledTimes(1);
});

test('exposes only immutable watch controls as a non-enumerable global', () => {
  cleanups.push(installConsole());
  expect(Object.keys(globalThis.tml)).toEqual(['watch', 'unwatch']);
  expect(Object.isFrozen(globalThis.tml)).toBe(true);
  expect(Object.getOwnPropertyDescriptor(globalThis, 'tml')).toMatchObject({
    enumerable: false,
    writable: false,
    configurable: true,
  });
});

test('refuses to overwrite existing globals, including inherited properties', () => {
  const existing = { application: true };
  vi.stubGlobal('tml', existing);
  expect(() => installConsole()).toThrow('already exists');
  expect(globalThis.tml).toBe(existing);
  expect(() => installConsole(tml, { name: 'toString' })).toThrow('already exists');
  expect(() => installConsole(tml, { name: '' })).toThrow('must not be empty');
});

test('cleanup is repeatable and cannot remove a newer installation', () => {
  const remove = installConsole();
  cleanups.push(remove);
  remove();
  expect(Object.hasOwn(globalThis, 'tml')).toBe(false);

  cleanups.push(installConsole());
  const replacement = globalThis.tml;
  remove();
  expect(globalThis.tml).toBe(replacement);
});

test('server-side installation creates no global and provides harmless cleanup', () => {
  vi.unstubAllGlobals();
  const remove = installConsole();
  expect(Object.hasOwn(globalThis, 'tml')).toBe(false);
  expect(remove).not.toThrow();
});
