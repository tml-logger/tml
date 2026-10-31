import { hydrateRoot } from 'react-dom/client';
import { App } from './App';
import { createDemoClient } from './client';
import type { InitialData } from './shared';

const root = document.getElementById('root');
const bootstrap = document.getElementById('tml-bootstrap');
if (!root || !bootstrap?.textContent) {
  throw new Error('The SSR document is missing its bootstrap data.');
}
const initial = JSON.parse(bootstrap.textContent) as InitialData;
const client = createDemoClient(initial);
const reactRoot = hydrateRoot(root, <App initial={initial} client={client} />);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    client.dispose();
    reactRoot.unmount();
  });
}
