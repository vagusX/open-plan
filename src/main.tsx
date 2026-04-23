import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
import { PlanIndex } from './components/PlanIndex';
import { ReviewStateProvider } from './hooks/useReviewState';

type Init =
  | { mode: 'edit'; md: string; filePath: string }
  | { mode: 'index' };

declare global {
  interface Window {
    __INIT__: Init;
  }
}

const init = window.__INIT__;

const container = document.getElementById('root')!;
const root = createRoot(container);

root.render(
  <StrictMode>
    {init.mode === 'index' ? (
      <PlanIndex />
    ) : (
      <ReviewStateProvider initialMd={init.md} filePath={init.filePath}>
        <App />
      </ReviewStateProvider>
    )}
  </StrictMode>
);
