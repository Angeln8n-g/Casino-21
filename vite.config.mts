import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

// Supabase project hostname — used in CSP without exposing the secret key
const SUPABASE_HOST = 'kasino21.com';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'auto',
        devOptions: {
          enabled: true,
          type: 'module',
          suppressWarnings: true,
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,ttf}'],
          globIgnores: ['**/source-icon.png'],
          maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB limit
          runtimeCaching: [
            {
              // Cache static assets and images (same-origin only — third-party scripts like GTM must go directly to the network)
              urlPattern: ({ request, url }) => url.origin === self.location.origin && (request.destination === 'image' || request.destination === 'style' || request.destination === 'script' || request.destination === 'font'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'static-assets-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
                },
              },
            },
            {
              // Supabase API requests (Network-First)
              urlPattern: /^https:\/\/yarmgboyjjnodjszwiqi\.supabase\.co\/rest\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60, // 1 hour
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        manifest: {
          name: 'KASINO21 — Juego de Cartas Competitivo Online',
          short_name: 'KASINO21',
          description: 'Juego de cartas competitivo multijugador online gratis. Juega ranked 1v1 y 2v2, sube de rango ELO, completa misiones diarias y compite en torneos semanales.',
          theme_color: '#020617',
          background_color: '#020617',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          lang: 'es',
          categories: ['games', 'entertainment', 'social'],
          dir: 'ltr',
          orientation: 'any',
          icons: [
            { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
            { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
            { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
            { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
            { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        }
      })
    ],

    server: {
      port: 3000,
      headers: {
        // ── Content Security Policy ──────────────────────────────────────────
        // Restricts where the browser can load resources from.
        // Adjust 'connect-src' when the production socket URL is known.
        'Content-Security-Policy': [
          "default-src 'self'",
          // Scripts: AdSense + Google Analytics + dev HMR
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://pagead2.googlesyndication.com https://adservice.google.com https://tpc.googlesyndication.com https://googleads.g.doubleclick.net https://www.google.com https://www.gstatic.com https://www.googletagservices.com https://*.adtrafficquality.google",
          // Styles: allow inline (Tailwind/CSS-in-JS)
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          // Fonts
          "font-src 'self' https://fonts.gstatic.com",
          // Images: self + Supabase Storage + Unsplash + Google AdSense
          `img-src 'self' data: blob: https://${SUPABASE_HOST} https://*.supabase.co https://images.unsplash.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://adservice.google.com https://www.google.com https://*.doubleclick.net`,
          // API calls + WebSocket + AdSense Reporting + Supabase APIs
          `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} http://localhost:4000 ws://localhost:4000 https://*.supabase.co wss://*.supabase.co https://*.adtrafficquality.google https://www.google-analytics.com https://analytics.google.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://adservice.google.com https://tpc.googlesyndication.com https://www.google.com`,
          // Media: allow playing local sounds and sound tracks hosted on Supabase Storage
          "media-src 'self' blob: https://*.supabase.co",
          // AdSense iframes + Google services
          "frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://pagead2.googlesyndication.com https://www.google.com https://*.doubleclick.net https://*.adtrafficquality.google",
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
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-ui': ['lucide-react', 'qrcode.react'],
            // Las demás partes de código ya se separan automáticamente
            // gracias al React.lazy() que añadimos en App.tsx
          }
        }
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