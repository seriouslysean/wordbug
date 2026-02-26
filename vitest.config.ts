import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.spec.js'],
    setupFiles: ['tests/setup.js'],
    isolate: false,
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
        // Build-time utilities validated by build process
        'src/utils/static-file-utils.ts',
        'src/utils/static-paths-utils.ts',
        'src/content.config.ts',
        'src/pages/**',
        // CLI tools tested via integration tests
        'tools/**',
      ],
      thresholds: {
        autoUpdate: false,
        global: {
          branches: 85,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  define: {
    __VERSION__: JSON.stringify('test'),
    __RELEASE__: JSON.stringify('test'),
    __TIMESTAMP__: JSON.stringify('2000-01-01T00:00:00Z'),
  },
});
