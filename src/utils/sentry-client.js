import * as Sentry from '@sentry/astro';

const sentryEnabled = import.meta.env?.SENTRY_ENABLED === 'true' || process.env.SENTRY_ENABLED === 'true';

/**
 * Standard Sentry error logging
 * @param {Error|string} error - Error to log
 * @param {Object} context - Additional context
 * @param {string} level - Error level (error, warning, info)
 */
export function logError(error, context = {}, level = 'error') {
  if (!sentryEnabled) {
    return;
  }

  try {
    if (Object.keys(context).length > 0) {
      Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });

        if (error instanceof Error) {
          Sentry.captureException(error);
        } else {
          Sentry.captureMessage(String(error), level);
        }
      });
    } else {
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(String(error), level);
      }
    }
  } catch {
    // Silent fail - Sentry not available
  }
}

/**
 * Backward compatibility for existing usage
 */
export function logSentryError(useCase, params = {}, error = undefined, level = 'error') {
  const message = error instanceof Error ? error : `Error: ${useCase}`;
  logError(message, params, level);
}

/**
 * Safe wrapper for operations that should not throw
 */
export function safeOperation(fn, fallback = null, context = 'Safe operation') {
  try {
    return fn();
  } catch (error) {
    logError(`Safe operation failed: ${context}`, { error: error.message }, 'warning');
    return fallback;
  }
}
