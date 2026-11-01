# @tmlog/core

Shared types and utilities for TML — Tiny Micro Logger: structured events,
scope matching, error normalization, sanitization, and HTTP alert transport.

For application logging, start with `@tmlog/browser` or `@tmlog/node`. Both
include core as a dependency. Use this package directly for custom integrations.

## Install

```sh
npm install @tmlog/core
```

This package ships ES modules and TypeScript declarations.

## Create and sanitize an event

```ts
import { createEvent, sanitizeAlertEvent } from '@tmlog/core';

const event = createEvent({
  type: 'alert',
  level: 'error',
  scope: 'checkout.failed',
  message: 'Checkout failed',
  data: { orderId: 'demo-123', password: 'example-only' },
  runtime: { type: 'node', service: 'api' },
});

const sanitized = sanitizeAlertEvent(event);
console.log(sanitized.data); // { orderId: 'demo-123', password: '[REDACTED]' }
```

Sanitization recursively redacts known field names and handles circular
references. Options include `redact`, `maxDepth`, `maxArrayLength`,
`maxStringLength`, and `maxObjectKeys`. Additional `redact` rules can be field
names or regular expressions. Redaction matches keys, not arbitrary secrets
embedded in message strings.

## Match scopes

```ts
import { matchesPattern } from '@tmlog/core';

matchesPattern('api.request', 'api.*'); // true
matchesPattern('db.query', 'api.*');    // false
```

Patterns match the entire scope; `*` matches any sequence of characters.

Other exports include `normalizeError`, `sanitizeValue`,
`createHttpAlertTransport`, and types such as `TmlEvent`, `TmlAlertTransport`,
and `TmlSanitizeOptions`. The HTTP transport sends JSON using the supplied
`fetch` function; it does not check HTTP response status. Use a custom
transport when you need delivery checks or retry behavior.

See the [project documentation](https://github.com/tml-logger/tml#readme) for
browser and Node.js usage.

## License

[MIT](LICENSE).
