import {
  browserTracingIntegration,
  init,
  replayIntegration,
} from '@sentry/astro';

init({
  dsn: __SENTRY_DSN__,
  environment: __SENTRY_ENVIRONMENT__,
  release: __RELEASE__,
  integrations: [
    browserTracingIntegration(),
    replayIntegration({
      // Site content is public -- unmasked replays are far more useful for debugging
      maskAllText: false,
      blockAllMedia: false,
      maskAllInputs: false,
    }),
  ],
  // Free tier: 5M spans/month, low-traffic site won't approach this
  tracesSampleRate: 1.0,
  // Free tier: 50 replays/month -- spend the budget on error replays only
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  maxBreadcrumbs: 30,
  initialScope: {
    tags: {
      site: __SITE_ID__,
    },
  },
  // Filter browser noise from extensions and cross-browser quirks.
  // Even with zero client JS, extensions inject scripts into every page.
  ignoreErrors: [
    /ResizeObserver loop/,
    /Failed to fetch|NetworkError when attempting to fetch resource|Load failed/,
    /Extension context invalidated/,
    /Non-Error (exception|promise rejection) captured/,
    'AbortError',
    /Failed to execute '\w+' on 'Node'/,
    "can't access dead object",
  ],
  // Ignore errors originating from browser extension source files
  denyUrls: [
    /^chrome-extension:\/\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-extension:\/\//i,
    /^safari-web-extension:\/\//i,
    /^webkit-masked-url:\/\//i,
  ],
});
