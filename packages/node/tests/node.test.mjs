import { afterEach, expect, test, vi } from 'vitest';
import assert from 'node:assert/strict';
import { createTml } from '../src/index.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

test.each(['debug', 'info', 'warn', 'error'])('%s records its level and uses the matching console method', (level) => {
  const output = vi.spyOn(console, level).mockImplementation(() => {});
  const send = vi.fn();
  const tml = createTml({ development: true, console: true, alert: { transport: { send } } });
  const data = { attempt: 2 };
  tml[level]('api.request', 'with data', data);
  expect(output).toHaveBeenLastCalledWith('[api.request]', 'with data', data);
  expect(tml.dump()[0]).toMatchObject({ type: 'log', level, scope: 'api.request', message: 'with data', data });
  tml[level]('api.request', 'without data');
  expect(output).toHaveBeenLastCalledWith('[api.request]', 'without data');
  expect(send).not.toHaveBeenCalled();
});

test.each(['log', 'debug', 'info', 'warn', 'error'])('%s respects disabled buffering and console output', (method) => {
  const output = vi.spyOn(console, method).mockImplementation(() => {});
  const tml = createTml({ development: false, console: false });
  tml[method]('api.request', 'hidden');
  expect(tml.dump()).toEqual([]);
  expect(output).not.toHaveBeenCalled();
});

test('node buffers logs in development and ring buffer is bounded', () => {
  const tml = createTml({ development: true, buffer: { maxEvents: 2 } });
  tml.log('one', '1');
  tml.log('two', '2');
  tml.log('three', '3');
  assert.deepEqual(tml.dump().map((event) => event.scope), ['two', 'three']);
  tml.clear();
  assert.equal(tml.dump().length, 0);
});

test('node does not expose logs when development is disabled', () => {
  const tml = createTml({ development: false });
  tml.log('secret', 'not replayable');
  assert.deepEqual(tml.dump(), []);
});

test('node alerts use custom transport and transport failures are isolated', async () => {
  let received;
  const tml = createTml({
    alert: { transport: { send(event) { received = event; } } },
  });
  await tml.alert('payments', 'failed', { apiKey: 'abc', id: 1 }, new Error('bad'));
  assert.equal(received.data.apiKey, '[REDACTED]');
  assert.equal(received.data.id, 1);

  tml.configure({ alert: { transport: { async send() { throw new Error('network'); } } } });
  await assert.doesNotReject(() => tml.alert('payments', 'failed again'));
});
