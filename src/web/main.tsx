import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { PWAManager } from './components/pwa/PWAManager';
import './index.css';
import { Howler } from 'howler';

// ── Increase HTML5 Audio Pool size globally to prevent exhaustion ────────────────────
Howler.html5PoolSize = 120;

// ── Suppress React DevTools advertisement in production ───────────────────────
// Must run before React initializes. In dev, this is skipped so that
// Fast Refresh / HMR continue to work without interference.
if (import.meta.env.PROD) {
  (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    isDisabled: true,
    supportsFiber: true,
    inject() {},
    onCommitFiberRoot() {},
    onCommitFiberUnmount() {},
  };
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <PWAManager>
      <App />
    </PWAManager>
  </React.StrictMode>
);