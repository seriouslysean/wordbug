import { init } from '@sentry/astro';

init({
  dsn: __SENTRY_DSN__,
  environment: __SENTRY_ENVIRONMENT__,
  release: __RELEASE__,
  // Static site: no server-side performance tracing needed
  tracesSampleRate: 0,
  initialScope: {
    tags: {
      site: __SITE_ID__,
    },
  },
});
