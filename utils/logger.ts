/**
 * Node.js logger for CLI tools.
 * Same proxy-over-console pattern as src/utils/logger.ts but backed
 * by @sentry/node instead of @sentry/astro.
 *
 * All log levels always output (CLI tools need their output).
 * Error-level calls are forwarded to Sentry when enabled.
 * Sentry is lazily initialized on the first error and flushed before exit.
 */
import * as Sentry from '@sentry/node';

import { isLogContext } from '#types';

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

/**
 * Flushes pending Sentry events. Resolves immediately when Sentry is not
 * initialized. Prefer {@link exit} for the common flush-then-exit pattern.
 */
export const flush = (): Promise<boolean> =>
  initialized ? Sentry.flush(2000) : Promise.resolve(true);

/**
 * Flushes pending Sentry events and terminates the process. Use this instead
 * of bare process.exit() in error handlers to avoid losing captured errors.
 */
/**
 * Extracts a message string from an unknown thrown value.
 */
export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const exit = async (code: number): Promise<never> => {
  await flush();
  process.exit(code);
};

export const logger = new Proxy(console, {
  get(target, prop: string) {
    const originalMethod = Reflect.get(target, prop);
    if (typeof originalMethod !== 'function') {
      return originalMethod;
    }

    return (...args: unknown[]) => {
      originalMethod.apply(target, args);

      if (!isEnabled || prop !== 'error') {
        return;
      }

      try {
        ensureInitialized();
        const [subject, rawContext] = args;
        Sentry.withScope((scope) => {
          scope.setLevel('error');
          if (isLogContext(rawContext)) {
            for (const [key, value] of Object.entries(rawContext)) {
              scope.setExtra(key, value);
            }
          }
          if (subject instanceof Error) {
            Sentry.captureException(subject);
          } else {
            Sentry.captureMessage(String(subject), 'error');
          }
        });
      } catch {
        // Silent fail if Sentry not available
      }
    };
  },
});

export default logger;
