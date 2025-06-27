import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import sentry from '@sentry/astro';
import sitemap from '@astrojs/sitemap';
import pkg from './package.json' with { type: 'json' };

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

// Determine environment for Sentry
const environment = env.SENTRY_ENVIRONMENT || (mode === 'production' ? 'production' : 'development');

// Let Sentry auto-generate release from git commit (recommended for CI/CD)



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
      environment,
      tracesSampleRate: environment === 'production' ? 0.1 : 1, // Sample 10% in prod, 100% in dev
      replaysSessionSampleRate: 0, // Free tier: disable session replays
      replaysOnErrorSampleRate: environment === 'production' ? 0.1 : 0, // Free tier: only error replays in prod
      sendDefaultPii: false, // Be more conservative with PII
      beforeSend(event) {
        // Don't send events in development unless explicitly enabled
        if (environment === 'development' && !env.SENTRY_DEBUG) {
          return null;
        }
        // Add additional context
        if (event.tags) {
          event.tags.mode = mode;
          event.tags.site = site;
        } else {
          event.tags = { mode, site };
        }
        return event;
      },
      sourceMapsUploadOptions: {
        project: env.SENTRY_PROJECT,
        authToken: env.SENTRY_AUTH_TOKEN,
        environment,
        setCommits: {
          auto: true,
        },
        tags: {
          version: `v${pkg.version}`, // Tag release with semver for filtering
        },
        deploy: {
          env: environment,
        },
        finalize: true, // Finalize release to make it visible in dashboard
        ignoreMissing: true,
      },
    }),
    sitemap(),
  ],
});

// Sentry integration is only for frontend/client-side code in Astro static sites.
// This config disables session replays (free tier), only enables error replays in production, and uses the version from package.json for release.
// Source maps are uploaded via CI/CD (see GitHub Actions workflow).
