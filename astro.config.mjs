import { defineConfig } from 'astro/config';
import sentry from '@sentry/astro';
import sitemap from '@astrojs/sitemap';
import { execSync } from 'node:child_process';

import pkg from './package.json' with { type: 'json' };

// Load .env locally, skip in CI (GitHub Actions etc)
if (!process.env.CI) {
  import('dotenv/config');
}

// Validate required environment variables
const requiredEnvVars = [
  'SITE_URL',
  'SITE_TITLE',
  'SITE_DESCRIPTION',
  'SITE_NAME',
  'SITE_AUTHOR',
  'WORDNIK_API_KEY',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const site = process.env.SITE_URL;
const base = process.env.BASE_PATH;
const isProdRelease = process.env.SENTRY_ENVIRONMENT === 'production';
const shortSha = execSync('git rev-parse --short HEAD').toString().trim();
const version = `${pkg.version}${isProdRelease ? '' : '-dev'}`;
const release = `${pkg.name}@${version}+${shortSha}`;
const timestamp = new Date().toISOString();

if (!process.env.SENTRY_RELEASE) {
  process.env.SENTRY_RELEASE = release;
}

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
        '~adapters': '/src/adapters',
      },
    },
    define: {
      __VERSION__: JSON.stringify(pkg.version),
      __RELEASE__: JSON.stringify(release),
      __SENTRY_DSN__: JSON.stringify(process.env.SENTRY_DSN),
      __TIMESTAMP__: JSON.stringify(timestamp),
    },
  },
  integrations: [
    ...(process.env.SENTRY_ENABLED === 'true' ? [sentry({
      sourceMapsUploadOptions: {
        project: process.env.SENTRY_PROJECT,
        org: process.env.SENTRY_ORG,
        authToken: process.env.SENTRY_AUTH_TOKEN,
      },
    })] : []),
    sitemap(),
  ],
});
