import { randomUUID } from 'node:crypto';
import { createTml } from '@tmlog/node';
import { sanitizeAlertEvent, type TmlEvent } from '@tmlog/core';

export function createRequestContext(development: boolean, consoleOutput = true) {
  const requestId = randomUUID();
  const logger = createTml({
    service: 'demo-react-fullstack',
    development,
    console: consoleOutput,
    buffer: { maxEvents: 100 },
  });
  return { requestId, logger, development };
}

export type RequestContext = ReturnType<typeof createRequestContext>;

export function diagnostics(context: RequestContext): { logs?: TmlEvent[] } {
  if (!context.development) {
    return {};
  }
  return { logs: context.logger.dump().map((event) => sanitizeAlertEvent(event)) };
}
