/**
 * Client-side Sentry utilities for error reporting
 * Used in frontend components and utilities for enhanced error tracking
 */

let sentryInitialized = false;
let Sentry = null;

/**
 * Initialize Sentry if available (only runs in browser)
 */
export function initSentry() {
  if (typeof window === 'undefined' || sentryInitialized) {
    return;
  }

  try {
    // Sentry should already be initialized by Astro integration
    // This is just to get a reference to it for manual error reporting
    if (window.__SENTRY__) {
      Sentry = window.__SENTRY__;
      sentryInitialized = true;
    }
  } catch (error) {
    console.warn('Sentry not available:', error.message);
  }
}

/**
 * Log an error to Sentry with context
 * @param {Error|string} error - Error to log
 * @param {Object} context - Additional context
 * @param {string} level - Error level (error, warning, info)
 */
export function logError(error, context = {}, level = 'error') {
  // Always log to console for development
  console.error('Error:', error, context);

  if (!sentryInitialized) {
    initSentry();
  }

  if (Sentry?.captureException) {
    try {
      if (typeof error === 'string') {
        Sentry.captureMessage(error, level);
      } else {
        Sentry.captureException(error);
      }

      // Add context if provided
      if (Object.keys(context).length > 0) {
        Sentry.withScope(scope => {
          Object.keys(context).forEach(key => {
            scope.setContext(key, context[key]);
          });
        });
      }
    } catch (sentryError) {
      console.warn('Failed to send error to Sentry:', sentryError.message);
    }
  }
}

/**
 * Log a warning message
 * @param {string} message - Warning message
 * @param {Object} context - Additional context
 */
export function logWarning(message, context = {}) {
  logError(message, context, 'warning');
}

/**
 * Log info for debugging
 * @param {string} message - Info message
 * @param {Object} context - Additional context
 */
export function logInfo(message, context = {}) {
  logError(message, context, 'info');
}

/**
 * Wrap async functions with error handling
 * @param {Function} fn - Function to wrap
 * @param {string} context - Context description
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(fn, context = 'Unknown operation') {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, {
        context,
        args: args.length > 0 ? args : undefined
      });
      throw error;
    }
  };
}

/**
 * Safe wrapper for operations that should not throw
 * @param {Function} fn - Function to wrap
 * @param {*} fallback - Fallback value if operation fails
 * @param {string} context - Context description
 * @returns {*} Function result or fallback
 */
export function safeOperation(fn, fallback = null, context = 'Safe operation') {
  try {
    return fn();
  } catch (error) {
    logWarning(`Safe operation failed: ${context}`, { error: error.message });
    return fallback;
  }
}

/**
 * Log an error to Sentry with a consistent message and parameters
 * @param {string} useCase - The error use case (e.g. 'NoWordData', 'InvalidPath')
 * @param {Object} params - Dynamic data for the error
 * @param {Error|string} [error] - Optional error object
 * @param {string} [level] - Error level (error, warning, info)
 */
export function logSentryError(useCase, params = {}, error = undefined, level = 'error') {
  const message = `Error: ${useCase}`;
  // Always log to console for development
  if (error) {
    console.error(message, params, error);
  } else {
    console.error(message, params);
  }
  if (!sentryInitialized) {
    initSentry();
  }
  if (Sentry?.captureException) {
    try {
      Sentry.withScope(scope => {
        Object.entries(params).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
        if (error instanceof Error) {
          scope.setContext('error', { message: error.message, stack: error.stack });
          Sentry.captureException(error);
        } else {
          Sentry.captureMessage(message, level);
        }
      });
    } catch (sentryError) {
      console.warn('Failed to send error to Sentry:', sentryError.message);
    }
  }
}
