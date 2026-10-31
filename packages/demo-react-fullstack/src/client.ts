import { createTml, installConsole } from '@tmlog/browser';
import { errorMessage, type AlertReceipt, type AlertResult, type ApiResult, type InitialData, type LogMethod } from './shared';

export function createDemoClient(initial: InitialData) {
  const alertResults = new Map<string, AlertResult>();
  const logger = createTml({
    service: 'demo-react-fullstack',
    alert: {
      transport: {
        async send(event) {
          const data = event.data as { submissionId: string; simulateFailure: boolean };
          let endpoint = '/api/alerts';
          if (data.simulateFailure) {
            endpoint += '?fail=1';
          }
          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(event),
              signal: AbortSignal.timeout(5000),
            });
            if (!response.ok) {
              alertResults.set(data.submissionId, { ok: false, status: response.status, message: `Alert delivery failed (HTTP ${response.status}).` });
              return;
            }
            const receipt = await response.json() as AlertReceipt;
            alertResults.set(data.submissionId, { ok: true, status: response.status, message: 'Sanitized alert received by the server.', receipt });
          } catch (error) {
            alertResults.set(data.submissionId, { ok: false, message: `Alert delivery failed: ${errorMessage(error)}` });
          }
        },
      },
    },
  });

  const dispose = installConsole(logger);

  return {
    dispose,
    hydrated() {
      logger.info('demo.client.hydration', 'React hydration complete', { requestId: initial.requestId });
    },
    watch() {
      logger.watch('demo.*');
    },
    unwatch() {
      logger.unwatch('demo.*');
    },
    log(method: LogMethod) {
      logger[method]('demo.client.action', `${method} from the browser`, { requestId: initial.requestId, example: 'Synthetic demo data' });
    },
    async request(fail: boolean) {
      let endpoint = '/api/demo';
      if (fail) {
        endpoint += '?fail=1';
      }
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
      const result = await response.json() as ApiResult;
      logger.info('demo.client.request', 'API response received', { requestId: result.requestId, status: response.status });
      return { status: response.status, ...result };
    },
    replaySsr() {
      if (!initial.development) {
        return;
      }
      logger.replay(initial.logs ?? []);
    },
    async alert(simulateFailure: boolean): Promise<AlertResult> {
      const submissionId = crypto.randomUUID();
      await logger.alert('demo.client.alert', 'Synthetic checkout failure', {
        submissionId,
        simulateFailure,
        customerId: 'demo-customer',
        password: 'demo-password',
        nested: { accessToken: 'demo-access-token' },
        headers: { authorization: 'Bearer demo-secret' },
      }, new Error('Synthetic payment error'));
      const result = alertResults.get(submissionId);
      alertResults.delete(submissionId);
      if (!result) {
        return { ok: false, message: 'The alert transport did not confirm delivery.' };
      }
      return result;
    },
  };
}

export type DemoClient = ReturnType<typeof createDemoClient>;
