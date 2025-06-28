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
        __SENTRY_DSN__: 'readonly',
        __RELEASE__: 'readonly',
      },
    },
    rules: {
      'quotes': ['error', 'single'],
      'comma-dangle': ['error', 'always-multiline'],
      'curly': ['error', 'all'],
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
