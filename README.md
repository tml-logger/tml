# TML — Tiny Micro Logger

This is a version of a logging tool I have used for many years. It allows you
to add permanent logs to your frontend code, but rather than fill console with logs
it only shows the ones you a watching.

It is very simple by design and tiny in size.

## Packages

- `@tmlog/core`
- `@tmlog/browser`
- `@tmlog/node`

## Browser

```ts
import tml from '@tmlog/browser';

tml.log('api.request', 'Request complete', { duration: 42 });
tml.debug('api.request', 'Request details', { url: '/api/items' });
tml.info('api.request', 'Items loaded');
tml.warn('api.request', 'Retrying request', { attempt: 2 });
tml.error('api.request', 'Request failed', new Error('Network unavailable'));
```

Both browser and Node loggers support `log`, `debug`, `info`, `warn`, and `error`
with the signature `(scope, message, data?)`. Each uses the matching console
method. Browser logging at every level follows watch/unwatch; DevTools' own
level filters also apply (enable Verbose to see debug messages).
Node buffers preserve levels, and browser replay restores them. `error()` writes
a log event; use `alert()` when you want to send an alert to your backend.

To control logging from browser DevTools, install the console controls once in
your app's browser entry point:

```ts
import { installConsole } from '@tmlog/browser';

const removeConsole = installConsole();
```

Then run these commands in the browser console:

```js
tml.watch('api.*'); // Show subsequent logs matching this scope
tml.unwatch('api.*'); // Remove that watch pattern
tml.watch('*'); // Show all scopes
tml.unwatch('*'); // Remove the all-scopes pattern
```

The controls use the package's default logger. For a logger created with
`createTml()`, pass that instance: `installConsole(myLogger)`. If the page already
uses the global name `tml`, choose another with
`installConsole(myLogger, { name: 'appLogs' })`, then use `appLogs.watch('api.*')`.
Existing globals are never overwritten.

Installation is explicit, so your app can choose whether to enable it in
development, production, or both. It is a no-op during server-side rendering.
The global exposes only `watch` and `unwatch`; these control future log output
for that instance. Browser loggers restore watch patterns from localStorage on
startup and save changes under `tmlog.watches` for the current origin, so watches
survive page reloads and subsequent requests. Both `unwatch()` and the cleanup
function returned by `watch()` save removals. If storage is unavailable, watches
continue to work in memory. Server-side rendering does not access storage.
Removing one pattern does not remove other overlapping patterns.

Call `removeConsole()` to remove the console controls. For Vite hot reload:

```ts
if (import.meta.hot) {
  import.meta.hot.dispose(removeConsole);
}
```

## Node

```ts
import tml from '@tmlog/node';

tml.log('db.query', 'Query complete', { duration: 18 });
const events = tml.dump(); // development only
```

## Alerts

```ts
tml.configure({
  alert: {
    endpoint: '/api/alerts'
  }
});

await tml.alert('payments.stripe', 'Charge failed', { customerId }, error);
```

Or provide your own backend transport:

```ts
tml.configure({
  alert: {
    transport: {
      async send(event) {
        await myBackend.send(event);
      }
    }
  }
});
```

Alert events are normalized, recursively redacted, bounded, and safely serialized before transport.

## Full-stack React demo

`packages/demo-react-fullstack` is a private React + Express playground with real
server rendering, hydration, scoped browser logging, API calls, server-log
replay, and a synthetic alert receiver.

```sh
yarn demo              # Build TML libraries and start http://localhost:5173
yarn demo:build        # Build libraries, browser assets, and the Node server
yarn demo:start        # Run the production build
yarn demo:test:e2e     # Build and test both development and production in Chromium
yarn typecheck        # Check libraries and the demo
```

Set `PORT` to choose another local port. Browser tests use ports 5174 and 5175.
If Chromium is not installed, run
`yarn workspace demo-react-fullstack playwright install chromium` first.
`yarn test` includes the demo's server and serialization tests; `yarn lint`
includes its application code. The demo consumes the libraries' public workspace
exports. Restart `yarn demo` after changing library source to rebuild it; demo
React changes use Fast Refresh.

Open DevTools and run `tml.watch('demo.*')`, or click **Watch demo scopes**.
Try the log-level buttons, make API requests, and explicitly replay captured
server events. Use `tml.unwatch('demo.*')` to remove that watch. Other patterns
you add manually still apply. Enable Verbose in DevTools for debug messages.

Server buffers belong to individual requests, are limited to 100 events, and
are sanitized before being sent to the browser. Development includes these
snapshots in SSR bootstrap data and API responses. Production omits them and
disables replay; browser logging and alerts remain interactive in both modes.
The rendered request ID and timestamp are reused during hydration.

Alert examples use fake credentials. The custom transport reports actual HTTP
success or failure; the receiver validates a maximum 64 KB JSON payload and
redacts it again. Receipts are returned to the initiating browser and are not
stored. The demo binds to localhost and requires no accounts or external services.

## Development

This project uses Yarn 4, with the version pinned in `package.json`. Enable
Corepack to make the `yarn` command use the project's pinned version:

```sh
corepack enable
yarn install
yarn build
yarn test
```

For CI, use `yarn install --immutable` to enforce the committed lockfile.

`yarn build` packages each library with [Rslib](https://rslib.rs/), producing ESM
and TypeScript declarations in its `dist/` directory. Core builds first so the
browser and Node packages can resolve its declarations.

Tests live in each package's `tests/` directory and use [Vitest](https://vitest.dev/).
They run directly against source, so no build is required. Use `yarn test` for a
single run, `yarn test:watch` during development, or `yarn test packages/core` to
run only one package's tests.

Run `yarn lint` to check the project with Oxlint's default starter configuration
plus rules requiring braces and avoiding ternaries (`.oxlintrc.json`), or
`yarn lint:fix` to apply automatic fixes. Project code style is documented in `AGENTS.md`.
