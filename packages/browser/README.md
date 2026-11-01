# @tmlog/browser

Scoped browser logging for TML — Tiny Micro Logger. Choose which log scopes
appear in DevTools, preserve watch patterns between page loads, and replay
events captured by a server logger.

## Install

```sh
npm install @tmlog/browser
```

This package ships ES modules and TypeScript declarations. It includes
`@tmlog/core` as a dependency.

## Quick start

Run this in your browser application's entry point and open DevTools:

```ts
import tml, { installConsole } from '@tmlog/browser';

installConsole();
tml.watch('app.*');
tml.info('app.start', 'Application ready', { version: '1.0.0' });
```

Use `tml.unwatch('app.*')` in DevTools to hide subsequent matching messages.
Use `tml.watch('app.*')` to enable them again, then repeat the action that logs
the event. `*` matches any sequence of characters; `tml.watch('*')` enables
all scopes. Watching does not replay earlier browser messages.

`installConsole()` exposes only `watch` and `unwatch` globally and returns a
cleanup function. It does nothing during server-side rendering and rejects an
existing global name. Choose another name with
`installConsole(tml, { name: 'appLogs' })` if needed.

## Log levels and persistence

The logger provides `log`, `debug`, `info`, `warn`, and `error`, each accepting
`(scope, message, data?)`. All levels follow watch patterns and use the matching
console method. Enable Verbose in DevTools to see debug output.

Watch patterns are saved in localStorage under `tmlog.watches` and restored
on startup. If storage is unavailable, watches still work in memory. Removing
one pattern leaves other matching patterns active.

For a separate logger, use `createTml()` and pass it to `installConsole()`.
Logger instances have their own in-memory watches but share the same storage
key within an origin.

## Alerts and replay

```ts
tml.configure({ alert: { endpoint: '/api/alerts' } });
await tml.alert('checkout.failed', 'Checkout failed', { orderId: 'demo-123' });
```

Provide your own endpoint or `alert.transport.send(event)` implementation.
Alerts apply key-based redaction and data limits before transport. `error()`
logs locally; it does not send an alert. Alerts do not require a matching watch.

Use `tml.replay(events)` to display an iterable of TML events, respecting watch
patterns and log levels. Sanitize server events before exposing them to a browser.

See the [project documentation](https://github.com/tml-logger/tml#readme) for
configuration and a React + Express demo.

## License

[MIT](LICENSE).
