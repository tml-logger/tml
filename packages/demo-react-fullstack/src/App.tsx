import { useEffect, useState } from 'react';
import type { DemoClient } from './client';
import { errorMessage, type InitialData, type LogMethod } from './shared';

const levels: LogMethod[] = ['log', 'debug', 'info', 'warn', 'error'];

export function App({ initial, client }: { initial: InitialData; client?: DemoClient }) {
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState('Saved watches are restored on startup. Open DevTools to choose scopes.');
  const [requestResult, setRequestResult] = useState('Make a request to see its status and request ID.');
  const [alertResult, setAlertResult] = useState('Send an alert to inspect the sanitized server receipt.');
  const [requestBusy, setRequestBusy] = useState(false);
  const [alertBusy, setAlertBusy] = useState(false);

  useEffect(() => {
    setHydrated(true);
    client?.hydrated();
  }, [client]);

  let hydrationLabel = 'Server rendered · waiting for JavaScript';
  if (hydrated) {
    hydrationLabel = 'Hydrated · ready for interaction';
  }
  let mode = 'Production';
  let replayDescription = 'Server diagnostics are unavailable in production. No server logs are included in HTML or API responses.';
  if (initial.development) {
    mode = 'Development';
    replayDescription = 'Replay this page’s SSR logs. Only watched scopes appear in DevTools.';
  }

  function watch() {
    client?.watch();
    setNotice('Ran tml.watch(\'demo.*\'). Try a log button or replay server logs.');
  }

  function unwatch() {
    client?.unwatch();
    setNotice('Ran tml.unwatch(\'demo.*\'). Any other patterns you added in DevTools still apply.');
  }

  async function copyCommand(command: string) {
    try {
      await navigator.clipboard.writeText(command);
      setNotice(`Copied ${command}`);
    } catch {
      setNotice('Clipboard unavailable. Select and copy the command shown above.');
    }
  }

  async function request(fail: boolean) {
    if (!client) {
      return;
    }
    setRequestBusy(true);
    try {
      const result = await client.request(fail);
      setRequestResult(JSON.stringify({ status: result.status, requestId: result.requestId, message: result.message }, null, 2));
    } catch (error) {
      setRequestResult(errorMessage(error));
    } finally {
      setRequestBusy(false);
    }
  }

  async function alert(fail: boolean) {
    if (!client) {
      return;
    }
    setAlertBusy(true);
    try {
      setAlertResult(JSON.stringify(await client.alert(fail), null, 2));
    } catch (error) {
      setAlertResult(errorMessage(error));
    } finally {
      setAlertBusy(false);
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="TML playground home"><img className="brand-logo" src="/logo.svg" alt="tiny micro logger" width="545.5" height="253.6" /></a>
        <span className="mode">{mode} playground</span>
      </header>
      <main>
        <section className="hero">
          
          <h1>Tiny micro logger demo</h1>
          <p className="intro">A few things to try with React and Express. Open your browser console to see the logs.</p>
        </section>

        <section className="render-strip" aria-labelledby="render-title">
          <div><p id="render-title">Current request</p><strong data-testid="hydration-status">{hydrationLabel}</strong><p>{initial.message}</p></div>
          <dl><dt>Request ID</dt><dd data-testid="request-id">{initial.requestId}</dd><dt>Rendered at</dt><dd><time>{initial.generatedAt}</time></dd></dl>
        </section>

        <div className="grid">
          <section className="card console-card" aria-labelledby="watch-title">
            <h2 id="watch-title">Watch a scope</h2>
            <p>Open your browser console and watch a scope. Your watches are saved between page loads.</p>
            <div className="command"><code>tml.watch('demo.*')</code><button className="copy" disabled={!hydrated} onClick={() => copyCommand("tml.watch('demo.*')")} aria-label="Copy watch command">Copy</button></div>
            <div className="command"><code>tml.unwatch('demo.*')</code><button className="copy" disabled={!hydrated} onClick={() => copyCommand("tml.unwatch('demo.*')")} aria-label="Copy unwatch command">Copy</button></div>
            <div className="actions"><button disabled={!hydrated} onClick={watch}>Watch demo scopes</button><button className="secondary" disabled={!hydrated} onClick={unwatch}>Unwatch demo scopes</button></div>
            <p className="notice" role="status">{notice}</p>
          </section>

          <section className="card" aria-labelledby="levels-title">
            <h2 id="levels-title">Try the log levels</h2>
            <p>Same scope, same context, the native console method you expect. Try each level after enabling a watch.</p>
            <div className="level-buttons">{levels.map((level) => <button key={level} className={`level ${level}`} disabled={!hydrated} onClick={() => client?.log(level)}>{level}</button>)}</div>
            <div className="hint"><code>demo.client.action</code><p>Enable Verbose in DevTools to see debug output. Your console’s level filters still apply.</p></div>
          </section>

          <section className="card" aria-labelledby="api-title">
            <h2 id="api-title">Make an API request</h2>
            <p>Try a successful or failed request. Each gets a new request ID.</p>
            <div className="actions"><button disabled={!hydrated || requestBusy} onClick={() => request(false)}>Successful request</button><button className="secondary" disabled={!hydrated || requestBusy} onClick={() => request(true)}>Fail a request</button></div>
            <pre className="result" data-testid="request-result" aria-live="polite">{requestResult}</pre>
          </section>

          <section className="card" aria-labelledby="replay-title">
            <h2 id="replay-title">Replay server logs</h2>
            <p>{replayDescription}</p>
            <div className="actions"><button disabled={!hydrated || !initial.development} onClick={() => client?.replaySsr()}>Replay SSR logs</button></div>
          </section>

          <section className="card alert-card" aria-labelledby="alerts-title">
            <div className="alert-intro"><h2 id="alerts-title">Send an alert</h2><p>Send a synthetic checkout alert. Passwords, access tokens, and authorization headers are redacted before transport and again on receipt.</p><div className="actions"><button disabled={!hydrated || alertBusy} onClick={() => alert(false)}>Send demo alert</button><button className="secondary" disabled={!hydrated || alertBusy} onClick={() => alert(true)}>Fail alert delivery</button></div><p className="fineprint">Synthetic data only. Receipts are not stored. Delivery status comes from the actual HTTP response.</p></div>
            <pre className="result alert-result" data-testid="alert-result" aria-live="polite">{alertResult}</pre>
          </section>
        </div>
      </main>
      <footer><p>Tiny micro logger · React + Express demo</p></footer>
    </div>
  );
}
