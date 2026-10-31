import {
  createEvent,
  createHttpAlertTransport,
  sanitizeAlertEvent,
  type TmlAlertConfig,
  type TmlAlertTransport,
  type TmlEvent,
  type TmlLevel,
  type TmlLogMethods,
  type TmlSanitizeOptions,
} from '@tmlog/core';
import { RingBuffer } from './ring-buffer.js';

export interface NodeTmlConfig extends TmlSanitizeOptions {
  service?: string;
  development?: boolean;
  console?: boolean;
  buffer?: {
    maxEvents?: number;
  };
  alert?: TmlAlertConfig;
}

export interface NodeTml extends TmlLogMethods {
  alert(scope: string, message: string, data?: unknown, error?: unknown): Promise<void>;
  dump(): TmlEvent[];
  clear(): void;
  configure(config: NodeTmlConfig): void;
}

export function createTml(initialConfig: NodeTmlConfig = {}): NodeTml {
  let config: NodeTmlConfig = {
    development: initialConfig.development ?? ((globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV !== 'production'),
    console: initialConfig.console ?? false,
    ...initialConfig,
  };

  let buffer = new RingBuffer<TmlEvent>(config.buffer?.maxEvents ?? 1000);

  const runtime = () => ({ type: 'node' as const, service: config.service });

  const writeLog = (level: TmlLevel | undefined, scope: string, message: string, data?: unknown): void => {
    const event = createEvent({ type: 'log', level, scope, message, data, runtime: runtime() });
    if (config.development) {
      buffer.push(event);
    }
    if (!config.console) {
      return;
    }
    const method = level ?? 'log';
    if (data === undefined) {
      console[method](`[${scope}]`, message);
      return;
    }
    console[method](`[${scope}]`, message, data);
  };

  const resolveTransport = (): TmlAlertTransport | undefined => {
    if (config.alert?.transport) {
      return config.alert.transport;
    }
    if (!config.alert?.endpoint) {
      return undefined;
    }
    if (typeof globalThis.fetch !== 'function') {
      return undefined;
    }

    return createHttpAlertTransport({
      endpoint: config.alert.endpoint,
      headers: config.alert.headers,
      fetch: globalThis.fetch.bind(globalThis) as never,
    });
  };

  return {
    log: (scope, message, data) => writeLog(undefined, scope, message, data),
    debug: (scope, message, data) => writeLog('debug', scope, message, data),
    info: (scope, message, data) => writeLog('info', scope, message, data),
    warn: (scope, message, data) => writeLog('warn', scope, message, data),
    error: (scope, message, data) => writeLog('error', scope, message, data),

    async alert(scope, message, data, error) {
      const event = sanitizeAlertEvent(
        createEvent({ type: 'alert', scope, message, data, error, runtime: runtime(), level: 'error' }),
        config,
      );

      const transport = resolveTransport();
      if (!transport) {
        return;
      }

      try {
        await transport.send(event);
      } catch {
        // Alert infrastructure must not crash the application.
      }
    },

    dump() {
      if (!config.development) {
        return [];
      }
      return buffer.values();
    },

    clear() {
      buffer.clear();
    },

    configure(next) {
      const oldMax = config.buffer?.maxEvents ?? 1000;
      let bufferConfig = config.buffer;
      let alert = config.alert;
      if (next.buffer) {
        bufferConfig = { ...bufferConfig, ...next.buffer };
      }
      if (next.alert) {
        alert = { ...alert, ...next.alert };
      }
      config = {
        ...config,
        ...next,
        buffer: bufferConfig,
        alert,
        redact: next.redact ?? config.redact,
      };

      const newMax = config.buffer?.maxEvents ?? 1000;
      if (newMax === oldMax) {
        return;
      }
      const previous = buffer.values();
      buffer = new RingBuffer<TmlEvent>(newMax);
      for (const event of previous.slice(-newMax)) {
        buffer.push(event);
      }
    },
  };
}

const tml = createTml();
export default tml;
export { RingBuffer } from './ring-buffer.js';
export type { TmlEvent, TmlAlertTransport } from '@tmlog/core';
