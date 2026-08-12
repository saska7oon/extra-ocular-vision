/// <reference types="vitest/globals" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vitest config for unit testing React components + storage layer.
// Uses happy-dom as the DOM environment.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/setup.ts', 'src/sw.ts'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
});