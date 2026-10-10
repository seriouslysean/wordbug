/**
 * Core logger factory. Creates a console proxy that optionally forwards
 * error-level calls to Sentry. Environment-specific wrappers (CLI, Astro)
 * provide their own Sentry bridge and output filter.
 */
import { isLogContext } from '#types';

interface SentryScope {
  setLevel(level: string): void;
  setExtra(key: string, value: unknown): void;
}

export interface SentryBridge {
  withScope(callback: (scope: SentryScope) => void): void;
  captureException(error: Error): void;
  captureMessage(message: string): void;
}

export interface CreateLoggerOptions {
  sentry?: SentryBridge;
  shouldOutput?: (level: string) => boolean;
}

export function createLogger(options: CreateLoggerOptions = {}): Console {
  const { sentry, shouldOutput } = options;

  return new Proxy(console, {
    get(target, prop: string) {
      const originalMethod = Reflect.get(target, prop);
      if (typeof originalMethod !== 'function') {
        return originalMethod;
      }

      return (...args: unknown[]) => {
        if (!shouldOutput || shouldOutput(prop)) {
          originalMethod.apply(target, args);
        }

        if (!sentry || prop !== 'error') {
          return;
        }

        try {
          const [subject, rawContext] = args;
          sentry.withScope((scope) => {
            scope.setLevel('error');
            if (isLogContext(rawContext)) {
              for (const [key, value] of Object.entries(rawContext)) {
                scope.setExtra(key, value);
              }
            }
            if (subject instanceof Error) {
              sentry.captureException(subject);
            } else {
              sentry.captureMessage(String(subject));
            }
          });
        } catch {
          // Silent fail if Sentry not available
        }
      };
    },
  });
}
