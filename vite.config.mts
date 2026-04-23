import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Supabase project hostname — used in CSP without exposing the secret key
const SUPABASE_HOST = 'yarmgboyjjnodjszwiqi.supabase.co';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [react()],

    server: {
      port: 3000,
      headers: {
        // ── Content Security Policy ──────────────────────────────────────────
        // Restricts where the browser can load resources from.
        // Adjust 'connect-src' when the production socket URL is known.
        'Content-Security-Policy': [
          "default-src 'self'",
          // Scripts: only from this origin ('unsafe-inline' needed for dev HMR)
          "script-src 'self' 'unsafe-inline'",
          // Styles: allow inline (Tailwind/CSS-in-JS) + Google Fonts
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          // Fonts
          "font-src 'self' https://fonts.gstatic.com",
          // Images: self + Supabase Storage + Unsplash (used in EventsPage)
          `img-src 'self' data: blob: https://${SUPABASE_HOST} https://images.unsplash.com https://api.dicebear.com`,
          // API calls + WebSocket (Supabase realtime uses wss://)
          `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} http://localhost:4000 ws://localhost:4000`,
          // No iframes from unknown origins
          "frame-src 'none'",
          // No plugins
          "object-src 'none'",
          // Force HTTPS in production
          "upgrade-insecure-requests",
        ].join('; '),

        // ── Other security headers ───────────────────────────────────────────
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
    },

    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
      },
      minify: 'esbuild',
    },

    esbuild: {
      // ── Strip console.* and debugger ONLY in production builds ────────────
      // In dev mode (npm run dev) all console.* calls work normally.
      drop: isProduction ? (['console', 'debugger'] as ('console' | 'debugger')[]) : [],
    },
  };
});