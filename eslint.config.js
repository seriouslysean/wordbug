import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import astroParser from 'astro-eslint-parser';
import astro from 'eslint-plugin-astro';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      globals: {
        ...globals.browser,
        ...globals.node,
        Astro: 'readonly',
        buildData: 'readonly',
        // Vite build-time defines
        __HUMANS_DEVELOPER_CONTACT__: 'readonly',
        __HUMANS_DEVELOPER_NAME__: 'readonly',
        __HUMANS_DEVELOPER_SITE__: 'readonly',
        __HUMANS_WORD_CURATOR__: 'readonly',
        __RELEASE__: 'readonly',
        __SENTRY_DSN__: 'readonly',
        __SENTRY_ENVIRONMENT__: 'readonly',
        __SITE_ID__: 'readonly',
        __TIMESTAMP__: 'readonly',
        __VERSION__: 'readonly',
        __COLOR_PRIMARY__: 'readonly',
        __COLOR_PRIMARY_LIGHT__: 'readonly',
        __COLOR_PRIMARY_DARK__: 'readonly',
        __GA_ENABLED__: 'readonly',
        __GA_MEASUREMENT_ID__: 'readonly',
        __SITE_TITLE__: 'readonly',
        __SITE_DESCRIPTION__: 'readonly',
        __SITE_URL__: 'readonly',
        __SHOW_EMPTY_STATS__: 'readonly',
      },
    },
    rules: {
      'quotes': ['error', 'single'],
      'comma-dangle': ['error', 'always-multiline'],
      'curly': ['error', 'all'],
      'prefer-const': 'error',
      'brace-style': ['error', '1tbs'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'no-trailing-spaces': 'error',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'nonblock-statement-body-position': ['error', 'below'],
      'object-curly-newline': ['error', {
        'ImportDeclaration': {
          'multiline': true,
          'minProperties': 5,
        },
      }],
    },
  },
  {
    files: ['**/*.astro'],
    languageOptions: {
      parser: astroParser,
    },
    rules: {},
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      '.astro/',
      'coverage/',
    ],
  },
];
