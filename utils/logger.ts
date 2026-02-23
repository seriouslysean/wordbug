/**
 * Node.js logger for CLI tools.
 * All log levels always output (CLI tools need their output).
 * Error-level calls are forwarded to Sentry when enabled.
 * Sentry is lazily initialized on the first error and flushed before exit.
 */
import * as Sentry from '@sentry/node';

import { createLogger } from '#utils/logger-core';
import type { SentryBridge } from '#utils/logger-core';

const isEnabled = process.env.SENTRY_ENABLED === 'true' && !!process.env.SENTRY_DSN;

let initialized = false;

function ensureInitialized(): void {
  if (initialized || !isEnabled) {
    return;
  }
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || 'development',
    release: process.env.SENTRY_RELEASE || undefined,
    tracesSampleRate: 0,
    initialScope: {
      tags: {
        site: process.env.SITE_ID || 'unknown',
        runtime: 'cli',
      },
    },
  });
  initialized = true;
  process.on('beforeExit', () => {
    Sentry.flush(2000);
  });
}

const sentryBridge: SentryBridge = {
  withScope(callback) {
    ensureInitialized();
    Sentry.withScope(callback);
  },
  captureException(error) {
    Sentry.captureException(error);
  },
  captureMessage(message) {
    Sentry.captureMessage(message, 'error');
  },
};

/**
 * Flushes pending Sentry events. Resolves immediately when Sentry is not
 * initialized. Prefer {@link exit} for the common flush-then-exit pattern.
 */
export const flush = (): Promise<boolean> =>
  initialized ? Sentry.flush(2000) : Promise.resolve(true);

/**
 * Extracts a message string from an unknown thrown value.
 */
export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Flushes pending Sentry events and terminates the process. Use this instead
 * of bare process.exit() in error handlers to avoid losing captured errors.
 */
export const exit = async (code: number): Promise<never> => {
  await flush();
  process.exit(code);
};

export const logger = createLogger({
  sentry: isEnabled ? sentryBridge : undefined,
});

export default logger;
