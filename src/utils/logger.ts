/**
 * Astro logger for framework components and pages.
 * Dev: all log levels. Prod: only warn and error.
 * Error-level calls are forwarded to Sentry when enabled.
 */
import { SENTRY_ENABLED, SENTRY_DSN } from 'astro:env/client';
import { captureException, captureMessage, withScope } from '@sentry/astro';

import { createLogger } from '#utils/logger-core';
import type { SentryBridge } from '#utils/logger-core';

const isDev = import.meta.env?.DEV ?? false;
const sentryEnabled = SENTRY_ENABLED && !!SENTRY_DSN;

const sentryBridge: SentryBridge = {
  withScope,
  captureException,
  captureMessage(message) {
    captureMessage(message, 'error');
  },
};

const shouldOutput = (level: string): boolean =>
  isDev || level === 'warn' || level === 'error';

export const logger = createLogger({
  sentry: sentryEnabled ? sentryBridge : undefined,
  shouldOutput,
});

export const config = {
  isDev,
  sentryEnabled,
  version: import.meta.env?.npm_package_version ?? '0.0.0',
} as const;

export default logger;
