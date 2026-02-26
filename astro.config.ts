import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { statSync } from 'node:fs';

import sitemap from '@astrojs/sitemap';
import sentry from '@sentry/astro';
import { defineConfig, envField } from 'astro/config';

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
  await import('dotenv/config');
}

// Environment variable defaults for development and PR builds
const defaults = {
  SITE_URL: 'https://localhost:4321',
  SITE_TITLE: 'Occasional Word of the Day',
  SITE_DESCRIPTION: 'A word-of-the-day site featuring interesting vocabulary',
  SITE_ID: 'occasional-wotd',
  SOURCE_DIR: '',
  WORDNIK_WEBSITE_URL: 'https://www.wordnik.com',
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
// Sentry requires DSN to function — match the CLI logger's guard pattern
const sentryEnabled = process.env.SENTRY_ENABLED === 'true' && !!process.env.SENTRY_DSN;
if (process.env.SENTRY_ENABLED === 'true' && !process.env.SENTRY_DSN) {
  console.warn('SENTRY_ENABLED is true but SENTRY_DSN is not set — Sentry integration disabled');
}
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
  trailingSlash: 'never',
  devToolbar: { enabled: false },
  env: {
    schema: {
      SITE_TITLE: envField.string({ context: 'client', access: 'public', default: defaults.SITE_TITLE }),
      SITE_DESCRIPTION: envField.string({ context: 'client', access: 'public', default: defaults.SITE_DESCRIPTION }),
      SITE_ID: envField.string({ context: 'client', access: 'public', default: defaults.SITE_ID }),
      SITE_URL: envField.string({ context: 'client', access: 'public', default: defaults.SITE_URL }),
      SITE_LOCALE: envField.string({ context: 'client', access: 'public', default: 'en-US' }),
      SITE_KEYWORDS: envField.string({ context: 'client', access: 'public', default: '' }),
      SITE_AUTHOR: envField.string({ context: 'client', access: 'public', default: '' }),
      SITE_AUTHOR_URL: envField.string({ context: 'client', access: 'public', default: '' }),
      SITE_ATTRIBUTION_MESSAGE: envField.string({ context: 'client', access: 'public', default: '' }),
      HUMANS_WORD_CURATOR: envField.string({ context: 'client', access: 'public', default: '' }),
      HUMANS_DEVELOPER_NAME: envField.string({ context: 'client', access: 'public', default: '' }),
      HUMANS_DEVELOPER_CONTACT: envField.string({ context: 'client', access: 'public', default: '' }),
      HUMANS_DEVELOPER_SITE: envField.string({ context: 'client', access: 'public', default: '' }),
      COLOR_PRIMARY: envField.string({ context: 'client', access: 'public', default: '#9a3412' }),
      COLOR_PRIMARY_LIGHT: envField.string({ context: 'client', access: 'public', default: '#c2410c' }),
      COLOR_PRIMARY_DARK: envField.string({ context: 'client', access: 'public', default: '#7c2d12' }),
      COLOR_DARK_PRIMARY: envField.string({ context: 'client', access: 'public', optional: true }),
      COLOR_DARK_PRIMARY_LIGHT: envField.string({ context: 'client', access: 'public', optional: true }),
      COLOR_DARK_PRIMARY_DARK: envField.string({ context: 'client', access: 'public', optional: true }),
      COLOR_DARK_BACKGROUND: envField.string({ context: 'client', access: 'public', optional: true }),
      COLOR_DARK_BACKGROUND_LIGHT: envField.string({ context: 'client', access: 'public', optional: true }),
      COLOR_DARK_TEXT: envField.string({ context: 'client', access: 'public', optional: true }),
      COLOR_DARK_TEXT_LIGHT: envField.string({ context: 'client', access: 'public', optional: true }),
      COLOR_DARK_BORDER: envField.string({ context: 'client', access: 'public', optional: true }),
      GA_MEASUREMENT_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      GA_ENABLED: envField.boolean({ context: 'client', access: 'public', default: false }),
      SENTRY_ENABLED: envField.boolean({ context: 'client', access: 'public', default: false }),
      SENTRY_DSN: envField.string({ context: 'client', access: 'public', optional: true }),
      BASE_PATH: envField.string({ context: 'client', access: 'public', default: '/' }),
    },
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    define: {
      __VERSION__: JSON.stringify(pkg.version),
      __RELEASE__: JSON.stringify(release),
      __TIMESTAMP__: JSON.stringify(timestamp),
      __WORD_DATA_PATH__: JSON.stringify(
        process.env.SOURCE_DIR
          ? `data/${process.env.SOURCE_DIR}/words`
          : 'data/words',
      ),
    },
    build: {
      target: 'esnext',
      modulePreload: { polyfill: false },
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          chunkFileNames: '_astro/[name]-[hash].js',
          entryFileNames: '_astro/[name]-[hash].js',
        },
      },
    },
  },
  integrations: [
    ...(sentryEnabled ? [sentry({
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
