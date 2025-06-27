import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        // Node.js globals for build-time
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        // Universal globals
        console: 'readonly',
        setTimeout: 'readonly',
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
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
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
    files: ['src/utils/sentry-client.js', 'src/**/*client*.js'],
    languageOptions: {
      globals: {
        // Browser globals for client-side code
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
      },
    },
    rules: {
      // Allow console in client code for development debugging
      'no-console': 'warn',
    },
  },

  {
    files: ['tools/**/*.js', 'tests/**/*.js', 'astro.config.mjs', 'vitest.config.js', 'eslint.config.js', 'src/utils/logger.ts'],
    rules: {
      // Allow console in build tools, tests, config files, and logger
      'no-console': 'off',
    },
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
