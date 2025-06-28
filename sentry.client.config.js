import { sentrySharedConfig } from './config/sentry-shared.js';
import { init, browserTracingIntegration, replayIntegration } from '@sentry/astro';

init({
  ...sentrySharedConfig,
  replaysSessionSampleRate: sentrySharedConfig.tracesSampleRate,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    browserTracingIntegration(),
    replayIntegration(),
  ],
});
