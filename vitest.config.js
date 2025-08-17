import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.spec.js'],
    setupFiles: ['tests/setup.js'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: false,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'adapters/**/*.ts', 'tools/**/*.ts'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '.astro/**',
        'tests/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './src'),
      '~components': resolve(__dirname, './src/components'),
      '~layouts': resolve(__dirname, './src/layouts'),
      '~constants': resolve(__dirname, './constants'),
      '~astro-utils': resolve(__dirname, './src/utils'),
      '~utils': resolve(__dirname, './utils'),
      '~adapters': resolve(__dirname, './adapters'),
      '~types': resolve(__dirname, './types'),
      '~tools': resolve(__dirname, './tools'),
      '~data': resolve(__dirname, './data'),
      '~config': resolve(__dirname, './config'),
      '~locales': resolve(__dirname, './locales'),
      '~tests': resolve(__dirname, './tests'),
    },
  },
  define: {
    __VERSION__: JSON.stringify('test'),
    __RELEASE__: JSON.stringify('test'),
    __SENTRY_DSN__: JSON.stringify(''),
    __SHOW_EMPTY_STATS__: true,
    __ENVIRONMENT__: JSON.stringify('test'),
  },
});
