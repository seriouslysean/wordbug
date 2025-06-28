import { sentrySharedConfig } from './config/sentry-shared.js';
import { init } from '@sentry/astro';

init({
  ...sentrySharedConfig,
});
