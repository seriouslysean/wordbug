import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import astroParser from 'astro-eslint-parser';
import astro from 'eslint-plugin-astro';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    plugins: {
      'import': importPlugin,
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
        __SOURCE_DIR__: 'readonly',
      },
    },
    rules: {
      'quotes': ['error', 'single', {
        'avoidEscape': true,
        'allowTemplateLiterals': true,
      }],
      'comma-dangle': ['error', 'always-multiline'],
      'curly': ['error', 'all'],
      'prefer-const': 'error',
      'brace-style': ['error', '1tbs'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'no-trailing-spaces': 'error',
      'import/order': ['error', {
        groups: ['builtin', 'external', 'internal', 'type'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
        pathGroups: [{ pattern: '~**', group: 'internal' }],
        pathGroupsExcludedImportTypes: ['builtin'],
      }],
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
