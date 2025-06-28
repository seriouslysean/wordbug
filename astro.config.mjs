import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import sentry from '@sentry/astro';
import sitemap from '@astrojs/sitemap';
import pkg from './package.json' with { type: 'json' };

const mode = process.env.NODE_ENV || 'development';
const envFromFiles = loadEnv(mode, process.cwd(), '');
const env = {
  ...envFromFiles,
  ...process.env,
};
const site = env.SITE_URL;
const base = env.BASE_PATH;
const isProd = process.env.NODE_ENV === 'production';
const sentryEnabled = env.SENTRY_ENABLED === 'true';
const environment = env.SENTRY_ENVIRONMENT || (isProd ? 'production' : 'development');
const commit = env.GITHUB_SHA || 'local-dev';
const shortSha = commit.slice(0, 7);
const release = `${pkg.name}@${pkg.version}+${shortSha}`;
const namespaceKey = pkg.name;

export default defineConfig({
  site,
  base,
  output: 'static',
  devToolbar: { enabled: false },
  build: {
    assets: 'assets',
    target: 'esnext',
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
    define: {
      __BUILD_VERSION__: JSON.stringify(pkg.version),
      __BUILD_SHA__: JSON.stringify(shortSha),
      __BUILD_RELEASE__: JSON.stringify(release),
      __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
      __NAMESPACE_KEY__: JSON.stringify(namespaceKey),
    },
  },
  integrations: [
    ...(sentryEnabled ? [sentry({
      dsn: env.SENTRY_DSN,
      environment,
      release,
      // Standard performance monitoring
      tracesSampleRate: isProd ? 0.1 : 1.0,
      // Standard session replay
      replaysSessionSampleRate: isProd ? 0.1 : 1.0,
      replaysOnErrorSampleRate: 1.0,
      // Standard privacy settings
      sendDefaultPii: false,
      beforeSend(event) {
        // Only send in production or when explicitly enabled
        if (!sentryEnabled) {return null;}
        return event;
      },
      // Standard release management
      sourceMapsUploadOptions: {
        project: env.SENTRY_PROJECT,
        authToken: env.SENTRY_AUTH_TOKEN,
        release,
        environment,
        finalize: isProd,
        ...(isProd && {
          setCommits: {
            auto: true,
            ignoreMissing: true,
            ignoreEmpty: true,
          },
        }),
      },
      // Standard tagging
      initialScope: {
        tags: {
          version: pkg.version,
          commit: shortSha,
          environment,
        },
      },
    })] : []),
    sitemap(),
  ],
});
