import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '.astro/**',
        'test/**'
      ]
    }
  },
  resolve: {
    alias: {
      '~': '/src',
      '~components': '/src/components',
      '~layouts': '/src/layouts',
      '~utils': '/src/utils',
      '~data': '/src/data'
    }
  }
})
