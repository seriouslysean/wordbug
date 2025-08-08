import { captureException, captureMessage, withScope } from '@sentry/astro';

import type { LogContext } from '~types';

/**
 * Log an error to Sentry with optional context
 * @param {Error | string} error - Error object or message
 * @param {LogContext} [context={}] - Additional context for the log
 * @param {'error' | 'warning' | 'info'} [level='error'] - Severity level
 * @returns {void} Nothing
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
 * @param {string} useCase - Identifier for where the error occurred
 * @param {LogContext} [params={}] - Additional parameters for context
 * @param {Error} [error] - Original error instance
 * @param {'error' | 'warning' | 'info'} [level='error'] - Severity level
 * @returns {void} Nothing
 */
export function logSentryError(useCase: string, params: LogContext = {}, error?: Error, level: 'error' | 'warning' | 'info' = 'error'): void {
  const message = error instanceof Error ? error : `Error: ${useCase}`;
  logError(message, params, level);
}
