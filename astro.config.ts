import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

import sitemap from '@astrojs/sitemap';
import sentry from '@sentry/astro';
import { defineConfig, envField } from 'astro/config';

import pkg from './package.json' with { type: 'json' };
import { DEFAULT_WORDNIK_WEBSITE_URL } from '#constants/defaults';
import { isHexColor } from '#utils/color-utils';
import { getCodeHash } from '#utils/code-hash';

const colorFields = {
  COLOR_PRIMARY: { default: '#9a3412' },
  COLOR_PRIMARY_LIGHT: { default: '#c2410c' },
  COLOR_PRIMARY_DARK: { default: '#7c2d12' },
  COLOR_DARK_PRIMARY: { optional: true },
  COLOR_DARK_PRIMARY_LIGHT: { optional: true },
  COLOR_DARK_PRIMARY_DARK: { optional: true },
  COLOR_DARK_BACKGROUND: { optional: true },
  COLOR_DARK_BACKGROUND_LIGHT: { optional: true },
  COLOR_DARK_TEXT: { optional: true },
  COLOR_DARK_TEXT_LIGHT: { optional: true },
  COLOR_DARK_BORDER: { optional: true },
} as const;

const colorSchema = Object.fromEntries(
  Object.entries(colorFields).map(([name, options]) => [name, envField.string({
    context: 'client',
    access: 'public',
    ...options,
  })]),
);

// Load .env locally when present, skip in CI (GitHub Actions etc).
// Variables already set in the environment win over the file.
if (!process.env.CI && existsSync('.env')) {
  process.loadEnvFile();
}

// Environment variable defaults for development and PR builds
const defaults = {
  SITE_URL: 'https://localhost:4321',
  SITE_TITLE: 'Occasional Word of the Day',
  SITE_DESCRIPTION: 'A word-of-the-day site featuring interesting vocabulary',
  SITE_ID: 'occasional-wotd',
  SOURCE_DIR: '',
  WORDNIK_WEBSITE_URL: DEFAULT_WORDNIK_WEBSITE_URL,
};

// Apply defaults for missing environment variables
Object.entries(defaults).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
});

for (const name of Object.keys(colorFields)) {
  const value = process.env[name];
  if (value === undefined) {
    continue;
  }
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    delete process.env[name];
    continue;
  }
  if (!isHexColor(normalizedValue)) {
    throw new Error(`${name} must be a hex color such as #9a3412, got ${JSON.stringify(value)}`);
  }
  process.env[name] = normalizedValue;
}

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
const srcFiles = execSync('git ls-files src/', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(file => file.length > 0);
const codeHash = getCodeHash(srcFiles);
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
  // v7 changes the compressHTML default from `true` to `'jsx'` (collapses
  // whitespace between inline elements). Pin the v6 behavior to keep build
  // output byte-stable across the upgrade.
  compressHTML: true,
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
      ...colorSchema,
      GA_MEASUREMENT_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      GA_ENABLED: envField.boolean({ context: 'client', access: 'public', default: false }),
      SENTRY_ENABLED: envField.boolean({ context: 'client', access: 'public', default: false }),
      SENTRY_DSN: envField.string({ context: 'client', access: 'public', optional: true }),
      SENTRY_ENVIRONMENT: envField.string({ context: 'client', access: 'public', default: 'development' }),
      BASE_PATH: envField.string({ context: 'client', access: 'public', default: '/' }),
      SOURCE_DIR: envField.string({ context: 'client', access: 'public', default: defaults.SOURCE_DIR }),
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
    css: {
      transformer: 'lightningcss',
    },
    build: {
      target: 'esnext',
      modulePreload: { polyfill: false },
      reportCompressedSize: false,
      cssMinify: 'lightningcss',
      rollupOptions: {
        output: {
          chunkFileNames: '_astro/[name]-[hash].js',
          entryFileNames: '_astro/[name]-[hash].js',
        },
      },
    },
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  markdown: {
    // No markdown content; disable Shiki, whose inline styles are
    // incompatible with the CSP below (Astro warns otherwise).
    syntaxHighlight: false,
  },
  security: {
    csp: {
      // Astro auto-hashes its own bundled scripts and processed styles.
      // Dynamic content is served from same-origin endpoints (theme.css,
      // ga-init.js) covered by 'self'. The only external script is Google's
      // gtag.js loader. connect-src/img-src are intentionally left
      // unrestricted so GA and Sentry beacons are not enumerated per site.
      scriptDirective: {
        resources: ["'self'", 'https://www.googletagmanager.com'],
      },
      directives: [
        "object-src 'none'",
        "base-uri 'self'",
        // Sentry Session Replay compresses data in a blob-URL web worker
        "worker-src 'self' blob:",
      ],
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
      filter: (page) => !page.endsWith('.txt'),
    }),
  ],
});
