import type { TmlEvent } from '@tmlog/core';

export interface InitialData {
  requestId: string;
  generatedAt: string;
  message: string;
  development: boolean;
  logs?: TmlEvent[];
}

export interface ApiResult {
  requestId: string;
  message: string;
}

export interface AlertReceipt {
  requestId: string;
  receipt: TmlEvent;
}

export interface AlertResult {
  ok: boolean;
  message: string;
  status?: number;
  receipt?: AlertReceipt;
}

export type LogMethod = 'log' | 'debug' | 'info' | 'warn' | 'error';

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
