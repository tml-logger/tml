import {
  createEvent,
  createHttpAlertTransport,
  matchesAnyPattern,
  sanitizeAlertEvent,
  type TmlAlertConfig,
  type TmlAlertTransport,
  type TmlEvent,
  type TmlLevel,
  type TmlLogMethods,
  type TmlSanitizeOptions,
} from '@tmlog/core';

export interface BrowserTmlConfig extends TmlSanitizeOptions {
  service?: string;
  alert?: TmlAlertConfig;
}

export interface BrowserTml extends TmlLogMethods {
  alert(scope: string, message: string, data?: unknown, error?: unknown): Promise<void>;
  watch(pattern: string): () => void;
  unwatch(pattern: string): void;
  replay(events: Iterable<TmlEvent>): void;
  configure(config: BrowserTmlConfig): void;
}

const watchesStorageKey = 'tmlog.watches';

function loadWatches(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set();
  }

  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(watchesStorageKey) ?? '[]');
    if (!Array.isArray(stored)) {
      return new Set();
    }
    return new Set(stored.filter((pattern): pattern is string => typeof pattern === 'string' && pattern.length > 0));
  } catch {
    // Storage may be blocked or contain invalid JSON.
    return new Set();
  }
}

function saveWatches(watches: Set<string>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(watchesStorageKey, JSON.stringify([...watches]));
  } catch {
    // Keep in-memory watch controls working when storage is unavailable.
  }
}

function formatEvent(event: TmlEvent): [string, string, unknown?] {
  const prefix = `[${event.scope}]`;
  if (event.data === undefined) {
    return [prefix, event.message];
  }
  return [prefix, event.message, event.data];
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function writeConsoleEvent(event: TmlEvent): void {
  switch (event.level) {
    case 'debug':
    case 'info':
    case 'warn':
    case 'error':
      console[event.level](...formatEvent(event));
      return;
    default:
      console.log(...formatEvent(event));
  }
}

export function createTml(initialConfig: BrowserTmlConfig = {}): BrowserTml {
  let config: BrowserTmlConfig = { ...initialConfig };
  const watches = loadWatches();

  const unwatch = (pattern: string): void => {
    watches.delete(pattern);
    saveWatches(watches);
  };

  const runtime = () => ({ type: 'browser' as const, service: config.service });

  const writeLog = (level: TmlLevel | undefined, scope: string, message: string, data?: unknown): void => {
    if (!matchesAnyPattern(scope, watches)) {
      return;
    }
    const event = createEvent({ type: 'log', level, scope, message, data, runtime: runtime() });
    writeConsoleEvent(event);
  };

  const diagnostic = (scope: string, message: string, data?: unknown): void => {
    if (!matchesAnyPattern(scope, watches)) {
      return;
    }
    console.warn(...formatEvent(createEvent({ type: 'log', scope, message, data, runtime: runtime() })));
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
      keepalive: true,
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
        diagnostic('tml.transport', 'No alert transport configured');
        return;
      }

      try {
        await transport.send(event);
      } catch (transportError) {
        diagnostic('tml.transport', 'Alert delivery failed', {
          error: errorMessage(transportError),
        });
      }
    },

    watch(pattern) {
      watches.add(pattern);
      saveWatches(watches);
      return () => unwatch(pattern);
    },

    unwatch,

    replay(events) {
      for (const event of events) {
        if (!matchesAnyPattern(event.scope, watches)) {
          continue;
        }
        writeConsoleEvent(event);
      }
    },

    configure(next) {
      let alert = config.alert;
      if (next.alert) {
        alert = { ...alert, ...next.alert };
      }
      config = {
        ...config,
        ...next,
        alert,
        redact: next.redact ?? config.redact,
      };
    },
  };
}

const tml = createTml();

export type BrowserTmlConsole = Pick<BrowserTml, 'watch' | 'unwatch'>;

export interface BrowserTmlConsoleOptions {
  /** Global name used in DevTools, for example `tml.watch('api.*')`. */
  name?: string;
}

/**
 * Expose a logger's watch controls in the browser console.
 * Returns a cleanup function; does nothing during server-side rendering.
 */
export function installConsole(
  logger: BrowserTmlConsole = tml,
  { name = 'tml' }: BrowserTmlConsoleOptions = {},
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  if (!name) {
    throw new Error('The console global name must not be empty.');
  }
  if (name in globalThis) {
    throw new Error(`Cannot install TML console controls: globalThis.${name} already exists. Choose a different name.`);
  }

  const controls: BrowserTmlConsole = Object.freeze({
    watch: (pattern: string) => logger.watch(pattern),
    unwatch: (pattern: string) => logger.unwatch(pattern),
  });

  Object.defineProperty(globalThis, name, {
    value: controls,
    configurable: true,
    enumerable: false,
    writable: false,
  });

  return () => {
    // A later installation or another script may now own this global.
    if (Object.getOwnPropertyDescriptor(globalThis, name)?.value === controls) {
      Reflect.deleteProperty(globalThis, name);
    }
  };
}

export default tml;
export type { TmlEvent, TmlAlertTransport } from '@tmlog/core';
