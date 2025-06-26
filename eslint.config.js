import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,

  {
    languageOptions: {
      globals: {
        // Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        // Browser globals
        fetch: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      // Code style preferences
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      'curly': ['error', 'all'],

      // Spacing and formatting
      'indent': ['error', 2],
      'no-trailing-spaces': 'error',
      'eol-last': 'error',

      // Best practices
      'no-unused-vars': 'error',
      'no-console': 'warn',
      'prefer-const': 'error',
    },
  },

  {
    files: ['**/*.astro'],
    rules: {
      // Astro-specific overrides if needed
    },
  },

  {
    files: ['tools/**/*.js', 'astro.config.mjs', 'vitest.config.js', 'eslint.config.js'],
    rules: {
      // Allow console in build tools and config files
      'no-console': 'off',
    },
  },

  {
    ignores: [
      'dist/',
      'node_modules/',
      '.astro/',
    ],
  },
];
