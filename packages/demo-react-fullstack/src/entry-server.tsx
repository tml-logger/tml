import { renderToString } from 'react-dom/server';
import { App } from './App';
import type { InitialData } from './shared';

export function render(initial: InitialData): string {
  return renderToString(<App initial={initial} />);
}
