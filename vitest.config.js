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
      include: ['src/**/*.ts', 'adapters/**/*.ts', 'tools/**/*.ts', 'config/**/*.ts', 'utils/**/*.ts', 'constants/**/*.ts'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '.astro/**',
        'tests/**',
      ],
      thresholds: {
        autoUpdate: false,
        global: {
          branches: 80,
          functions: 75,
          lines: 55,
          statements: 55,
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
    __TIMESTAMP__: JSON.stringify('2024-01-01T00:00:00Z'),
    __SENTRY_DSN__: JSON.stringify(''),
    __SHOW_EMPTY_STATS__: true,
    __ENVIRONMENT__: JSON.stringify('test'),
    __SITE_TITLE__: JSON.stringify('Test Site'),
    __SITE_DESCRIPTION__: JSON.stringify('Test Description'),
    __SITE_ID__: JSON.stringify('test-site'),
    __SITE_LOCALE__: JSON.stringify('en'),
    __SITE_AUTHOR__: JSON.stringify('Test Author'),
    __SITE_AUTHOR_URL__: JSON.stringify('https://test.com'),
    __SITE_ATTRIBUTION_MESSAGE__: JSON.stringify('Test Attribution'),
    __SITE_KEYWORDS__: JSON.stringify('test,keywords'),
    __BASE_URL__: JSON.stringify('/'),
  },
});
