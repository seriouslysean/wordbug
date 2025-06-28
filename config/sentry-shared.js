// config/sentry-shared.js
import pkg from '../package.json' with { type: 'json' };

const isProd = process.env.NODE_ENV === 'production';
const commit = process.env.GITHUB_SHA || 'local-dev';
const shortSha = commit === 'local-dev' ? 'local' : commit.slice(0, 7);
const version = `${pkg.version}${isProd ? '' : '-dev'}`;
const release = `${pkg.name}@${version}+${shortSha}`;
const environment = process.env.SENTRY_ENVIRONMENT || (isProd ? 'production' : 'development');

export const sentrySharedConfig = {
  dsn: import.meta.env.PUBLIC_SENTRY_DSN,
  environment,
  release,
  tracesSampleRate: isProd ? 0.1 : 1.0,
  sendDefaultPii: false,
};
