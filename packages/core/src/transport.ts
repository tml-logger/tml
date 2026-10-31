import type { TmlAlertTransport, TmlEvent } from './types.js';

export type TmlFetch = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    keepalive?: boolean;
  },
) => Promise<unknown>;

export interface HttpTransportOptions {
  endpoint: string;
  headers?: Record<string, string>;
  fetch: TmlFetch;
  keepalive?: boolean;
}

export function createHttpAlertTransport(options: HttpTransportOptions): TmlAlertTransport {
  return {
    async send(event: TmlEvent): Promise<void> {
      await options.fetch(options.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(event),
        keepalive: options.keepalive,
      });
    },
  };
}
