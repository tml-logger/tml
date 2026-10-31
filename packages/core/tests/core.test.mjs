import { test } from 'vitest';
import assert from 'node:assert/strict';
import { matchesPattern, sanitizeAlertEvent, createEvent } from '../src/index.ts';

test('wildcard matching', () => {
  assert.equal(matchesPattern('foo', 'foo'), true);
  assert.equal(matchesPattern('foo.bar', 'foo'), false);
  assert.equal(matchesPattern('foo.bar', 'foo.*'), true);
  assert.equal(matchesPattern('foo.api.request', 'foo.*'), true);
  assert.equal(matchesPattern('anything', '*'), true);
});

test('alerts redact secrets recursively and preserve useful error data', () => {
  const event = createEvent({
    type: 'alert',
    scope: 'auth.login',
    message: 'Login failed',
    data: {
      username: 'joe',
      password: 'hunter2',
      nested: { accessToken: 'abc123' },
      headers: { authorization: 'Bearer secret' },
    },
    error: new Error('boom'),
    runtime: { type: 'node' },
  });

  const sanitized = sanitizeAlertEvent(event);
  assert.equal(sanitized.data.password, '[REDACTED]');
  assert.equal(sanitized.data.nested.accessToken, '[REDACTED]');
  assert.equal(sanitized.data.headers.authorization, '[REDACTED]');
  assert.equal(sanitized.error.message, 'boom');
  assert.match(sanitized.error.stack, /boom/);
});

test('sanitizer handles circular structures', () => {
  const value = { ok: true };
  value.self = value;
  const event = createEvent({
    type: 'alert', scope: 'test', message: 'circular', data: value, runtime: { type: 'node' }
  });
  const sanitized = sanitizeAlertEvent(event);
  assert.equal(sanitized.data.self, '[Circular]');
});
