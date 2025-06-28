import { captureException, captureMessage, withScope } from '@sentry/astro';

export function logError(error, context = {}, level = 'error') {
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

export function logSentryError(useCase, params = {}, error = undefined, level = 'error') {
  const message = error instanceof Error ? error : `Error: ${useCase}`;
  logError(message, params, level);
}
