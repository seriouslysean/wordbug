import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { statSync } from 'node:fs';

import sitemap from '@astrojs/sitemap';
import sentry from '@sentry/astro';
import { defineConfig } from 'astro/config';

import pkg from './package.json' with { type: 'json' };

// Generate code hash for Sentry release version
function getCodeHash() {
  const hash = createHash('sha256');

  const srcFiles = execSync('git ls-files src/', { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(file => file.length > 0)
    .sort();

  srcFiles.forEach(file => {
    try {
      const { size } = statSync(file);
      hash.update(`${file}:${size}`);
    } catch {
      // Skip files that don't exist (deleted but not yet committed)
      // This ensures consistent fingerprints across downstream apps
    }
  });

  return hash.digest('hex').substring(0, 8);
}

// Load .env locally, skip in CI (GitHub Actions etc)
if (!process.env.CI) {
  import('dotenv/config');
}

// Environment variable defaults for development and PR builds
const defaults = {
  SITE_URL: 'https://localhost:4321',
  SITE_TITLE: 'Occasional Word of the Day',
  SITE_DESCRIPTION: 'A word-of-the-day site featuring interesting vocabulary',
  SITE_ID: 'occasional-wotd',
  SOURCE_DIR: 'demo',
};

// Apply defaults for missing environment variables
Object.entries(defaults).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
});

// Validate that we now have all required variables
const requiredEnvVars = [
  'SITE_URL',
  'SITE_TITLE',
  'SITE_DESCRIPTION',
  'SITE_ID',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const site = process.env.SITE_URL;
const base = process.env.BASE_PATH;
const sentryEnvironment = process.env.SENTRY_ENVIRONMENT || 'development';
const codeHash = getCodeHash();
const version = pkg.version;
const release = `${pkg.name}@${version}+${codeHash}`;
const timestamp = new Date().toISOString();

if (!process.env.SENTRY_RELEASE) {
  process.env.SENTRY_RELEASE = release;
}

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'never',
  devToolbar: { enabled: false },
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  build: {
    inlineStylesheets: 'always',
  },
  vite: {
    resolve: {
      alias: {
        '~': '/src',
        '~components': '/src/components',
        '~layouts': '/src/layouts',
        '~astro-utils': '/src/utils',
        '~data': '/data',
        '~config': '/config',
        '~styles': '/src/styles',
        '~adapters': '/adapters',
        '~types': '/types',
        '~tools': '/tools',
        '~utils-tools': '/tools',
        '~utils': '/utils',
      },
    },
    define: {
      __VERSION__: JSON.stringify(pkg.version),
      __RELEASE__: JSON.stringify(release),
      __SENTRY_DSN__: JSON.stringify(process.env.SENTRY_DSN),
      __SENTRY_ENVIRONMENT__: JSON.stringify(sentryEnvironment),
      __SITE_ID__: JSON.stringify(process.env.SITE_ID),
      __SITE_TITLE__: JSON.stringify(process.env.SITE_TITLE),
      __SITE_DESCRIPTION__: JSON.stringify(process.env.SITE_DESCRIPTION),
      __SITE_URL__: JSON.stringify(process.env.SITE_URL || ''),
      __TIMESTAMP__: JSON.stringify(timestamp),
      __HUMANS_WORD_CURATOR__: JSON.stringify(process.env.HUMANS_WORD_CURATOR || ''),
      __HUMANS_DEVELOPER_NAME__: JSON.stringify(process.env.HUMANS_DEVELOPER_NAME || ''),
      __HUMANS_DEVELOPER_CONTACT__: JSON.stringify(process.env.HUMANS_DEVELOPER_CONTACT || ''),
      __HUMANS_DEVELOPER_SITE__: JSON.stringify(process.env.HUMANS_DEVELOPER_SITE || ''),
      __COLOR_PRIMARY__: JSON.stringify(process.env.COLOR_PRIMARY || '#9a3412'),
      __COLOR_PRIMARY_LIGHT__: JSON.stringify(process.env.COLOR_PRIMARY_LIGHT || '#c2410c'),
      __COLOR_PRIMARY_DARK__: JSON.stringify(process.env.COLOR_PRIMARY_DARK || '#7c2d12'),
      __ENVIRONMENT__: JSON.stringify(process.env.NODE_ENV),
      __GA_MEASUREMENT_ID__: JSON.stringify(process.env.GA_MEASUREMENT_ID),
      __GA_ENABLED__: process.env.GA_ENABLED === 'true',
      __SHOW_EMPTY_STATS__: process.env.SHOW_EMPTY_STATS === 'true',
      __SOURCE_DIR__: JSON.stringify(process.env.SOURCE_DIR || ''),
      __WORD_DATA_PATH__: JSON.stringify(
        process.env.SOURCE_DIR
          ? `data/${process.env.SOURCE_DIR}/words`
          : 'data/words',
      ),
      __SOCIAL_IMAGES_PATH__: JSON.stringify(
        process.env.SOURCE_DIR
          ? `public/${process.env.SOURCE_DIR}/images`
          : 'public/images',
      ),
    },
    build: {
      target: 'esnext',
      modulePreload: { polyfill: false },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
        },
      },
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
    sitemap({
      lastmod: new Date(),
      filter: (page) => !page.endsWith('.txt'),
    }),
  ],
});
