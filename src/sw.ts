/**
 * Custom Service Worker entry point for Extra-Ocular Vision.
 *
 * vite-plugin-pwa generates the Workbox service worker from this file plus
 * its `workbox` and `runtimeCaching` config in vite.config.ts. This file
 * adds custom behavior on top:
 *
 *  - Installs a cache-busting "skipWaiting" on activation
 *  - Pre-caches all bundled assets for offline-first operation
 *  - Falls back to /index.html for any document navigation (SPA routing)
 *
 * Note: Workbox typing in the webworker context is loose; we use targeted
 * casts where the @types diverge from the runtime.
 */

/// <reference lib="webworker" />
/// <reference types="vite/client" />

declare const self: ServiceWorkerGlobalScope;

// The precache manifest is injected by Workbox at build time.
declare const __WB_MANIFEST: Array<{ url: string; revision: string | null }>;

export const MANIFEST = self.__WB_MANIFEST;

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';

// Precache all bundled assets for offline-first operation.
precacheAndRoute(MANIFEST);
cleanupOutdatedCaches();

// Helper: extract requestDestination with a type cast (Workbox types
// do not expose it on RouteMatchCallbackOptions in the SW context).
type MatchOpts = { requestDestination?: string };
const matchDestination = (dest: string) => (opts: unknown): boolean => {
  const r = opts as MatchOpts;
  return r.requestDestination === dest;
};

const matchAnyDestination = (dests: string[]) => (opts: unknown): boolean => {
  const r = opts as MatchOpts;
  return dests.includes(r.requestDestination ?? '');
};

// Cache JS/CSS with stale-while-revalidate (fast + fresh).
registerRoute(
  matchAnyDestination(['script', 'style']),
  new StaleWhileRevalidate({ cacheName: 'js-css-cache' }),
);

// Cache images with cache-first (they change rarely).
registerRoute(
  matchDestination('image'),
  new CacheFirst({ cacheName: 'image-cache' }),
);

// Cache audio with cache-first (binaural beats, breathing guides).
registerRoute(
  matchDestination('audio'),
  new CacheFirst({ cacheName: 'audio-cache' }),
);

// SPA fallback: serve /index.html for all document navigations.
const documentHandler = async ({
  event,
}: {
  event: FetchEvent;
}): Promise<Response> => {
  const cache = await caches.open('html-cache');
  const cached = await cache.match('/');
  if (cached) return cached;
  return fetch(event.request);
};

registerRoute(matchDestination('document'), documentHandler as never);

// Lifecycle hooks
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});