import type { TmlError } from './types.js';

export function normalizeError(value: unknown, depth = 0): TmlError | undefined {
  if (value == null) {
    return undefined;
  }
  if (depth > 3) {
    return { message: '[Cause depth exceeded]' };
  }

  if (value instanceof Error) {
    return normalizeNativeError(value, depth);
  }

  if (typeof value === 'object') {
    return normalizeErrorRecord(value as Record<string, unknown>, depth);
  }

  return { message: String(value) };
}

function normalizeNativeError(value: Error, depth: number): TmlError {
  const output: TmlError = {
    name: value.name,
    message: value.message,
  };
  if (value.stack) {
    output.stack = value.stack;
  }
  if ('cause' in value && value.cause !== undefined) {
    output.cause = normalizeError(value.cause, depth + 1) ?? String(value.cause);
  }
  return output;
}

function normalizeErrorRecord(record: Record<string, unknown>, depth: number): TmlError {
  const output: TmlError = {};
  if (typeof record.name === 'string') {
    output.name = record.name;
  }
  if (typeof record.message === 'string') {
    output.message = record.message;
  }
  if (typeof record.stack === 'string') {
    output.stack = record.stack;
  }
  if (record.cause !== undefined) {
    output.cause = normalizeError(record.cause, depth + 1) ?? String(record.cause);
  }
  if (Object.keys(output).length > 0) {
    return output;
  }
  return { message: String(record) };
}
