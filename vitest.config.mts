import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // Neutralise `server-only` in tests — it throws when imported outside
      // Next.js's bundler context. This is the canonical Next.js + Vitest
      // interop pattern (see vercel/next.js discussions #50833).
      { find: /^server-only$/, replacement: path.resolve(__dirname, './vitest.stubs/server-only.ts') },
    ],
  },
});
