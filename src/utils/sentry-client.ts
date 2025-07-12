import { captureException, captureMessage, withScope } from '@sentry/astro';

import type { LogContext } from '~types/utils';

/**
 * Log an error to Sentry with optional context
 */
export function logError(error: Error | string, context: LogContext = {}, level: 'error' | 'warning' | 'info' = 'error'): void {
  if (import.meta.env.SENTRY_ENABLED !== 'true') {
    return;
  }
  if (Object.keys(context).length > 0) {
    withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      if (error instanceof Error) {
        captureException(error);
      } else {
        captureMessage(String(error), level);
      }
    });
  } else {
    if (error instanceof Error) {
      captureException(error);
    } else {
      captureMessage(String(error), level);
    }
  }
}

/**
 * Log a structured error to Sentry with use case identification
 */
export function logSentryError(useCase: string, params: LogContext = {}, error?: Error, level: 'error' | 'warning' | 'info' = 'error'): void {
  const message = error instanceof Error ? error : `Error: ${useCase}`;
  logError(message, params, level);
}
