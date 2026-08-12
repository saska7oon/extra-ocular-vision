import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Register the PWA service worker for offline-first operation.
// @ts-expect-error — vite-plugin-pwa injects this virtual module
import { registerSW } from 'virtual:pwa/register';

registerSW();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
