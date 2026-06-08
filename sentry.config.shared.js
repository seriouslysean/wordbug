/**
 * Base Sentry options shared by the client and server configs.
 * Accepts env values as arguments so neither config needs to know
 * about the other's import source.
 */
export function sharedSentryOptions(dsn, environment, release, siteId) {
  return {
    dsn,
    environment,
    release,
    initialScope: {
      tags: { site: siteId },
    },
  };
}
