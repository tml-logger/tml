# @tmlog/node

Node.js logging for TML — Tiny Micro Logger, with optional console output,
a development event buffer, and structured alerts.

## Install

```sh
npm install @tmlog/node
```

This package ships ES modules and TypeScript declarations. Use an `.mjs` file
or set `"type": "module"` in your application's `package.json`. It includes
`@tmlog/core` as a dependency.

## Quick start

```js
import tml from '@tmlog/node';

tml.configure({ console: true });
tml.info('app.start', 'Application ready');
tml.log('db.query', 'Query complete', { duration: 18 });

const events = tml.dump();
```

Console output is disabled by default. Setting `console: true` enables it
independently of the development buffer. Node logging does not use browser
watch patterns.

`log`, `debug`, `info`, `warn`, and `error` each accept `(scope, message, data?)`
and use the corresponding console method when console output is enabled.

## Development buffer

Development mode defaults to `NODE_ENV !== 'production'`. In this mode, the
logger retains up to 1,000 events. `dump()` returns them without clearing the
buffer; `clear()` removes them. With development mode disabled, new logs are
not buffered and `dump()` returns an empty array.

Create a logger with explicit settings:

```js
import { createTml } from '@tmlog/node';

const logger = createTml({
  service: 'api',
  development: true,
  console: true,
  buffer: { maxEvents: 100 },
});

logger.info('request.start', 'Request received', { requestId: 'demo-123' });
const events = logger.dump();
```

For request-specific buffers, create a logger for each request. Buffer events
are not automatically redacted; sanitize them before exposing them to clients.

## Alerts

Configure `alert.endpoint` with an absolute HTTP URL and a runtime that provides
`fetch`, or provide `alert.transport.send(event)` for your backend. Alert
payloads apply key-based redaction and data limits before transport.

```js
tml.configure({
  alert: {
    transport: {
      async send(event) {
        // Replace this example sink with your backend client.
        console.info('Alert received', event);
      },
    },
  },
});

await tml.alert('checkout.failed', 'Checkout failed', { orderId: 'demo-123' });
```

`error()` logs locally; it does not send an alert. Alerts are independent of
development buffering. Missing transports and transport failures do not throw
to the caller, so use a custom transport if you need delivery monitoring.

See the [project documentation](https://github.com/tml-logger/tml#readme) for
the browser package and a React + Express demo.

## License

[MIT](LICENSE).
