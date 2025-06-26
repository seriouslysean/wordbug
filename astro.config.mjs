import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import sentry from '@sentry/astro';

// Determine current mode, default to development if not specified
const mode = process.env.NODE_ENV || 'development';

// Load environment variables based on current mode
const envFromFiles = loadEnv(mode, process.cwd(), '');

// Create combined env object with process.env taking precedence
const env = {
  ...envFromFiles,
  ...process.env,
};

// Use environment variables with fallbacks for site config
const site = env.SITE_URL || env.BASE_URL || 'http://localhost:4321';
const base = env.BASE_PATH || '';


// https://astro.build/config
export default defineConfig({
  site,
  base,

  // Explicitly set static output
  output: 'static',


  devToolbar: {
    enabled: false,
  },

  build: {
    // Put assets in a dedicated directory
    assets: 'assets',
  },

  vite: {
    resolve: {
      alias: {
        '~': '/src',
        '~components': '/src/components',
        '~layouts': '/src/layouts',
        '~utils': '/src/utils',
        '~data': '/src/data',
        '~styles': '/src/styles',
        '~config': '/src/config',
      },
    },
  },
  integrations: [
    sentry({
      dsn: env.SENTRY_DSN,
      tracesSampleRate: 1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      sendDefaultPii: true,
      sourceMapsUploadOptions: {
        project: env.SENTRY_PROJECT,
        authToken: env.SENTRY_AUTH_TOKEN,
      },
    }),
  ],
});
