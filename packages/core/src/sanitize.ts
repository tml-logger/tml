import type { TmlEvent, TmlSanitizeOptions } from './types.js';

const DEFAULT_REDACT_KEYS = [
  'password',
  'passwd',
  'pass',
  'secret',
  'token',
  'accesstoken',
  'refreshtoken',
  'apikey',
  'api_key',
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'session',
  'sessionid',
  'privatekey',
  'clientsecret',
];

const REDACTED = '[REDACTED]';
const CIRCULAR = '[Circular]';
const TRUNCATED = '[Truncated]';
const UNSUPPORTED = '[Unsupported]';

interface InternalOptions {
  rules: Array<string | RegExp>;
  maxDepth: number;
  maxArrayLength: number;
  maxStringLength: number;
  maxObjectKeys: number;
}

function makeOptions(options: TmlSanitizeOptions = {}): InternalOptions {
  return {
    rules: [...DEFAULT_REDACT_KEYS, ...(options.redact ?? [])],
    maxDepth: options.maxDepth ?? 8,
    maxArrayLength: options.maxArrayLength ?? 100,
    maxStringLength: options.maxStringLength ?? 10_000,
    maxObjectKeys: options.maxObjectKeys ?? 100,
  };
}

function matchesRedactionKey(key: string, rules: Array<string | RegExp>): boolean {
  const normalized = key.toLowerCase();
  return rules.some((rule) => {
    if (typeof rule === 'string') {
      return normalized === rule.toLowerCase();
    }
    rule.lastIndex = 0;
    return rule.test(key);
  });
}

function sanitizeString(value: string, maxLength: number): string {
  if (value.length > maxLength) {
    return `${value.slice(0, maxLength)}${TRUNCATED}`;
  }
  return value;
}

function sanitizeArray(
  value: unknown[],
  options: InternalOptions,
  seen: WeakSet<object>,
  depth: number,
): unknown[] {
  const items = value
    .slice(0, options.maxArrayLength)
    .map((item) => sanitize(item, options, seen, depth + 1));
  if (value.length > options.maxArrayLength) {
    items.push(TRUNCATED);
  }
  return items;
}

function sanitize(
  value: unknown,
  options: InternalOptions,
  seen: WeakSet<object>,
  depth: number,
  key?: string,
): unknown {
  if (key && matchesRedactionKey(key, options.rules)) {
    return REDACTED;
  }

  if (value == null || typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizeString(value, options.maxStringLength);
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'symbol' || typeof value === 'function') {
    return UNSUPPORTED;
  }

  if (depth >= options.maxDepth) {
    return TRUNCATED;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof RegExp) {
    return String(value);
  }

  if (typeof value !== 'object') {
    return UNSUPPORTED;
  }
  if (seen.has(value)) {
    return CIRCULAR;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return sanitizeArray(value, options, seen, depth);
  }

  const output: Record<string, unknown> = {};
  const entries = Object.entries(value);
  for (const [entryKey, entryValue] of entries.slice(0, options.maxObjectKeys)) {
    output[entryKey] = sanitize(entryValue, options, seen, depth + 1, entryKey);
  }
  if (entries.length > options.maxObjectKeys) {
    output.__tml_truncated__ = true;
  }
  return output;
}

export function sanitizeValue(value: unknown, options: TmlSanitizeOptions = {}): unknown {
  return sanitize(value, makeOptions(options), new WeakSet<object>(), 0);
}

export function sanitizeAlertEvent(event: TmlEvent, options: TmlSanitizeOptions = {}): TmlEvent {
  const sanitized = sanitizeValue(event, options);
  return sanitized as TmlEvent;
}
