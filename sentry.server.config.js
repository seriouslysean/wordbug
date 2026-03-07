import { init } from '@sentry/astro';
import { SENTRY_DSN, SENTRY_ENVIRONMENT, SITE_ID } from 'astro:env/client';

init({
  dsn: SENTRY_DSN,
  environment: SENTRY_ENVIRONMENT,
  release: __RELEASE__,
  // Static site: no server-side performance tracing needed
  tracesSampleRate: 0,
  initialScope: {
    tags: {
      site: SITE_ID,
    },
  },
});
