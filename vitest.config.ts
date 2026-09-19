import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    exclude: ['tests/e2e/**'],
    setupFiles: ['tests/setup.ts'],
    env: {
      BASE_PATH: '/',
      SOURCE_DIR: 'demo',
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
        'src/content.config.ts',
        'src/pages/**',
        // These entry points run in spawned Node processes; their V8 counters
        // do not aggregate into Vitest. Real-process suites cover each one.
        'tools/generate-images.ts',
        'tools/normalize-word-data.ts',
        'tools/regenerate-all-words.ts',
      ],
      thresholds: {
        autoUpdate: false,
        branches: 85,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
  define: {
    __VERSION__: JSON.stringify('test'),
    __RELEASE__: JSON.stringify('test'),
    __TIMESTAMP__: JSON.stringify('2000-01-01T00:00:00Z'),
  },
});
