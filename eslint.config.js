import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';
import tsParser from '@typescript-eslint/parser';
import astroParser from 'astro-eslint-parser';
import globals from 'globals';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
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
