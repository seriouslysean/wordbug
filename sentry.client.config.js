import { browserTracingIntegration, init, replayIntegration } from '@sentry/astro';

init({
  dsn: __SENTRY_DSN__,
  environment: __SENTRY_ENVIRONMENT__,

  tracesSampleRate: 1.0,

  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Alternatively, use `process.env.npm_package_version` for a dynamic release version
  // if your build tool supports it.
  release: __RELEASE__,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // If the entire session is not sampled, use the below sample rate to sample
  // sessions when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    browserTracingIntegration(),
    replayIntegration(),
  ],

  initialScope: {
    tags: {
      site: __SITE_ID__,
    },
  },
});
