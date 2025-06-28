import { init } from '@sentry/astro';

init({
  dsn: __SENTRY_DSN__,
  environment: __SENTRY_ENVIRONMENT__,

  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Alternatively, use `process.env.npm_package_version` for a dynamic release version
  // if your build tool supports it.
  release: __RELEASE__,
});
