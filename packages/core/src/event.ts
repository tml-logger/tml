import type { TmlEvent, TmlEventType, TmlLevel, TmlRuntime } from './types.js';
import { normalizeError } from './error.js';

export interface CreateEventOptions {
  type: TmlEventType;
  scope: string;
  message: string;
  data?: unknown;
  error?: unknown;
  level?: TmlLevel;
  runtime: TmlRuntime;
  timestamp?: number;
}

export function createEvent(options: CreateEventOptions): TmlEvent {
  if (!options.scope || typeof options.scope !== 'string') {
    throw new TypeError('TML scope must be a non-empty string');
  }

  if (typeof options.message !== 'string') {
    throw new TypeError('TML message must be a string');
  }

  const event: TmlEvent = {
    version: 1,
    timestamp: options.timestamp ?? Date.now(),
    scope: options.scope,
    type: options.type,
    message: options.message,
    runtime: { ...options.runtime },
  };

  if (options.level) {
    event.level = options.level;
  }
  if (options.data !== undefined) {
    event.data = options.data;
  }

  const normalized = normalizeError(options.error);
  if (normalized) {
    event.error = normalized;
  }

  return event;
}
