import { init } from '@sentry/astro';
import { SENTRY_DSN, SENTRY_ENVIRONMENT, SITE_ID } from 'astro:env/client';

import { sharedSentryOptions } from './sentry.config.shared.js';

init({
  ...sharedSentryOptions(SENTRY_DSN, SENTRY_ENVIRONMENT, __RELEASE__, SITE_ID),
  // Static site: no server-side performance tracing needed
  tracesSampleRate: 0,
});
