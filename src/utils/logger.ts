import { captureException, captureMessage, withScope } from '@sentry/astro';

import { isLogContext } from '#types';

const isDev = import.meta.env?.DEV ?? false;
const sentryEnabled = !!__SENTRY_ENABLED__;

/**
 * Universal logger that proxies console and forwards errors to Sentry.
 * Dev: all log levels. Prod: only warn and error. Sentry: only error.
 */
export const logger = new Proxy(console, {
  get(target, prop: string) {
    const originalMethod = Reflect.get(target, prop);
    if (typeof originalMethod !== 'function') {
      return originalMethod;
    }

    return (...args: unknown[]) => {
      const isErrorLevel = prop === 'warn' || prop === 'error';
      if (!isDev && !isErrorLevel) {
        return;
      }

      originalMethod.apply(target, args);

      if (!sentryEnabled || prop !== 'error') {
        return;
      }

      try {
        const [subject, rawContext] = args;
        withScope((scope) => {
          scope.setLevel('error');
          if (isLogContext(rawContext)) {
            for (const [key, value] of Object.entries(rawContext)) {
              scope.setExtra(key, value);
            }
          }
          if (subject instanceof Error) {
            captureException(subject);
          } else {
            captureMessage(String(subject), 'error');
          }
        });
      } catch {
        // Silent fail if Sentry not available
      }
    };
  },
});

export const config = {
  isDev,
  sentryEnabled,
  version: import.meta.env?.npm_package_version ?? '0.0.0',
} as const;

export default logger;
