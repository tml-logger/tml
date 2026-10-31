export type TmlEventType = 'log' | 'alert';
export type TmlLevel = 'debug' | 'info' | 'warn' | 'error';

export interface TmlLogMethods {
  log(scope: string, message: string, data?: unknown): void;
  debug(scope: string, message: string, data?: unknown): void;
  info(scope: string, message: string, data?: unknown): void;
  warn(scope: string, message: string, data?: unknown): void;
  error(scope: string, message: string, data?: unknown): void;
}

export interface TmlRuntime {
  type: 'browser' | 'node' | string;
  service?: string;
}

export interface TmlError {
  name?: string;
  message?: string;
  stack?: string;
  cause?: unknown;
}

export interface TmlEvent {
  version: 1;
  timestamp: number;
  scope: string;
  type: TmlEventType;
  level?: TmlLevel;
  message: string;
  data?: unknown;
  error?: TmlError;
  runtime: TmlRuntime;
}

export interface TmlAlertTransport {
  send(event: TmlEvent): void | Promise<void>;
}

export interface TmlAlertConfig {
  endpoint?: string;
  headers?: Record<string, string>;
  transport?: TmlAlertTransport;
}

export interface TmlSanitizeOptions {
  redact?: Array<string | RegExp>;
  maxDepth?: number;
  maxArrayLength?: number;
  maxStringLength?: number;
  maxObjectKeys?: number;
}
