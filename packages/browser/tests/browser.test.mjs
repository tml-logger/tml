import { afterEach, expect, test, vi } from 'vitest';
import assert from 'node:assert/strict';
import { createTml } from '../src/index.ts';
import { createTml as createNodeTml } from '../../node/src/index.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

test.each(['log', 'debug', 'info', 'warn', 'error'])('%s respects watch/unwatch and uses its console method', (method) => {
  const output = vi.spyOn(console, method).mockImplementation(() => {});
  const send = vi.fn();
  const tml = createTml({ alert: { transport: { send } } });
  const data = { attempt: 2 };

  tml[method]('api.request', 'hidden', data);
  expect(output).not.toHaveBeenCalled();
  tml.watch('api.*');
  tml[method]('api.request', 'shown', data);
  expect(output).toHaveBeenLastCalledWith('[api.request]', 'shown', data);
  tml[method]('api.request', 'no data');
  expect(output).toHaveBeenLastCalledWith('[api.request]', 'no data');
  tml.unwatch('api.*');
  tml[method]('api.request', 'hidden again');
  expect(output).toHaveBeenCalledTimes(2);
  expect(send).not.toHaveBeenCalled();
});

test.each(['log', 'debug', 'info', 'warn', 'error'])('replay preserves %s from a Node buffer', (method) => {
  const output = vi.spyOn(console, method).mockImplementation(() => {});
  const node = createNodeTml({ development: true });
  const browser = createTml();
  node[method]('api.server', 'server message', { status: 503 });
  node[method]('db.query', 'unwatched');

  browser.watch('api.*');
  browser.replay(node.dump());
  expect(output).toHaveBeenCalledExactlyOnceWith('[api.server]', 'server message', { status: 503 });
});

test('replay treats unknown levels as ordinary logs', () => {
  const output = vi.spyOn(console, 'log').mockImplementation(() => {});
  const clear = vi.spyOn(console, 'clear').mockImplementation(() => {});
  const tml = createTml();
  tml.watch('*');
  tml.replay([
    { version: 1, timestamp: 1, scope: 'api', type: 'log', level: 'clear', message: 'unknown level', runtime: { type: 'node' } },
  ]);
  expect(output).toHaveBeenCalledExactlyOnceWith('[api]', 'unknown level');
  expect(clear).not.toHaveBeenCalled();
});

test('browser logs only watched scopes and supports replay', () => {
  const calls = [];
  const original = console.log;
  console.log = (...args) => calls.push(args);

  try {
    const tml = createTml();
    tml.log('api.request', 'hidden');
    assert.equal(calls.length, 0);

    tml.watch('api.*');
    tml.log('api.request', 'shown', { status: 200 });
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], ['[api.request]', 'shown', { status: 200 }]);

    tml.replay([
      { version: 1, timestamp: 1, scope: 'db.query', type: 'log', message: 'db', runtime: { type: 'node' } },
      { version: 1, timestamp: 2, scope: 'api.server', type: 'log', message: 'api', runtime: { type: 'node' } },
    ]);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1], ['[api.server]', 'api']);
  } finally {
    console.log = original;
  }
});

test('browser alert uses custom transport and redacts payload', async () => {
  let received;
  const tml = createTml({
    alert: {
      transport: { send(event) { received = event; } },
    },
  });

  await tml.alert('auth', 'failed', { password: 'secret', safe: 1 }, new Error('nope'));
  assert.equal(received.data.password, '[REDACTED]');
  assert.equal(received.data.safe, 1);
  assert.equal(received.error.message, 'nope');
});
