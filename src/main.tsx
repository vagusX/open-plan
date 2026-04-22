import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
import { ReviewStateProvider } from './hooks/useReviewState';

declare global {
  interface Window {
    __INIT__: { md: string; filePath: string };
  }
}

const { md, filePath } = window.__INIT__;

const container = document.getElementById('root')!;
const root = createRoot(container);

root.render(
  <StrictMode>
    <ReviewStateProvider initialMd={md} filePath={filePath}>
      <App />
    </ReviewStateProvider>
  </StrictMode>
);
