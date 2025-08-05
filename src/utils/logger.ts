/**
 * Enhanced Universal Logger for occasional-wotd
 *
 * Replaces the old logger.js with TypeScript support and better DRY principles.
 * Maintains backward compatibility while adding SENTRY_ENABLED environment control.
 *
 * Features:
 * - Environment-aware logging (dev shows console, prod controlled by SENTRY_ENABLED)
 * - TypeScript support with proper interfaces
 * - Fast-fail error handling with modern ES6
 * - DRY implementation - no duplicate code
 * - Optional Sentry integration (decoupled)
 */

import { logError } from '~utils-client/sentry-client';

// Fast-fail environment configuration
const isDev = import.meta.env?.DEV ?? false;
const sentryEnabled = (import.meta.env?.SENTRY_ENABLED || process.env.SENTRY_ENABLED) === 'true';


/**
 * Universal Logger Implementation - DRY with Proxy
 * Preserves console behavior while adding Sentry integration
 */
export const logger = new Proxy(console, {
  get(target, prop: string) {
    const originalMethod = Reflect.get(target, prop);
    if (typeof originalMethod !== 'function') {
return originalMethod;
}

    return (...args: unknown[]) => {
      // Console logging rules:
      // Dev: all log types, Prod: only warn and error
      if (!isDev && prop !== 'warn' && prop !== 'error') {
return;
}

      // Preserve original console behavior
      originalMethod.apply(target, args);

      // Sentry rules: only send errors (not warnings) when enabled
      if (!sentryEnabled || prop !== 'error') {
return;
}

      // Send only errors to Sentry
      try {
        logError(args[0] as string | Error, args[1] as { [key: string]: unknown }, 'error');
      } catch {
        // Silent fail if Sentry client not available
      }
    };
  },
});

/**
 * Configuration export for debugging and testing
 */
export const config = {
  isDev,
  sentryEnabled,
  version: import.meta.env?.npm_package_version ?? '0.0.0',
} as const;

/**
 * Default export for backward compatibility
 */
export default logger;
