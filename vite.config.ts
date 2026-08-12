import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// rollup-plugin-visualizer v2 ships a CommonJS module (no TS declarations).
// Its default export is a namespace object exposing a `visualizer` factory.
// @ts-expect-error — package ships no .d.ts; runtime default export is fine.
import visualizerPkg from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'node:path';

const visualizer = (visualizerPkg as { visualizer: (opts: Record<string, unknown>) => unknown }).visualizer;

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const analyze = mode === 'analyze';
  const plugins = [react()];

  // Bundle analysis (only in analyze mode)
  if (analyze) {
    plugins.push(
      visualizer({
        filename: 'dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'sunburst',
      }) as never,
    );
  }

  // Offline-first PWA via Workbox
  plugins.push(
    VitePWA({
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'injectManifest',
      srcDirClean: false,
      workbox: {
        runtimeCaching: [
          {
            // Always serve HTML from cache first (offline-capable core)
            urlPattern: ({ request }: { request: Request }) =>
              request.destination === 'document',
            handler: 'CacheFirst',
            options: {
              cacheName: 'html-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
          {
            // Static assets (audio, images) - cache first then network
            urlPattern: ({ request }: { request: Request }) =>
              ['audio', 'image', 'font', 'style', 'script'].includes(
                request.destination,
              ),
            handler: 'CacheFirst',
            options: {
              cacheName: 'asset-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Extra-Ocular Vision',
        short_name: 'EO-Vision',
        description:
          'Train extra-ocular vision (mindsight) perception - local-first, offline, no cloud.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0d1117',
        theme_color: '#0d1117',
        prefer_related_applications: false,
        icons: [
          {
            src: '/icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'New Session',
            short_name: 'Session',
            description: 'Start a daily training session',
            url: '/?action=new-session',
          },
          {
            name: 'Statistics',
            short_name: 'Stats',
            description: 'View progress and accuracy trends',
            url: '/?view=stats',
          },
          {
            name: 'Journal',
            short_name: 'Journal',
            description: 'Open training journal',
            url: '/?view=journal',
          },
        ],
      },
      devOptions: {
        enabled: mode === 'development',
      },
    }),
  );

  return {
    plugins,
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    build: {
      target: 'es2023',
      sourcemap: mode !== 'production',
    },
  };
});
