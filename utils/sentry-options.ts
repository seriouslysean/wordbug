/**
 * Sentry options that pin SDK 10 behaviour on SDK 11, which collects more by
 * default, and the Session Replay privacy options. The one definition for all
 * three inits: the browser and build-time server configs
 * (`sentry.config.shared.js`, `sentry.client.config.js`) and the CLI logger
 * (`utils/logger.ts`). No SDK import at runtime, so it loads everywhere.
 */
import type { NodeOptions } from '@sentry/node';

// Header and query-parameter names SDK 10 dropped when `sendDefaultPii` was off
const PII_KEY_DENYLIST = ['forwarded', '-ip', 'remote-', 'via', '-user'];

/**
 * The SDK 10 default (`sendDefaultPii` unset), category by category. SDK 11
 * replaced that flag with `dataCollection`, and leaving it unset now sends
 * user info (IP address included), cookies, unscrubbed headers and HTTP bodies.
 * The block is the one the SDK's migration guide gives for keeping the SDK 10
 * default, plus `frameContextLines`, which its table lists (7 to 5) and its
 * snippet leaves out.
 * @see https://github.com/getsentry/sentry-javascript/blob/11.6.0/MIGRATION.md#senddefaultpii-is-replaced-by-datacollection
 */
export const sentryDataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: {
    request: { deny: PII_KEY_DENYLIST },
    response: { deny: PII_KEY_DENYLIST },
  },
  httpBodies: [],
  urlQueryParams: { deny: PII_KEY_DENYLIST },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  graphQL: { document: false, variables: false },
  frameContextLines: 7,
} satisfies NodeOptions['dataCollection'];

/**
 * Options every init spreads in.
 * - `attachStacktrace`: SDK 11 turned it on. `logger.error('text')` becomes a
 *   `captureMessage`, and a synthetic stack trace on it would regroup those
 *   issues and count each one as an errored session.
 * - `traceLifecycle`: SDK 11 streams spans, which drops the `site` scope tag
 *   from them and replaces the pageload transaction. `'static'` keeps
 *   transactions. The SDK keeps it for backwards compatibility and plans to
 *   remove it in a later major.
 * @see https://github.com/getsentry/sentry-javascript/blob/11.6.0/MIGRATION.md#attachstacktrace-defaults-to-true
 * @see https://github.com/getsentry/sentry-javascript/blob/11.6.0/MIGRATION.md#span-streaming-is-now-the-default
 */
export const sentryBaselineOptions = {
  dataCollection: sentryDataCollection,
  attachStacktrace: false,
  traceLifecycle: 'static',
} satisfies NodeOptions;

interface NamedIntegration {
  name: string;
}

/**
 * Node default integrations as SDK 10 had them. SDK 11.2 added `Dedupe`, which
 * drops an event that repeats the one before it. It compares the message,
 * fingerprint and stack trace, not the context, where the logger puts what
 * differs: a tool that fails on three words in a row logs one message three
 * times, each with its own word, and would report the first only.
 * @see https://github.com/getsentry/sentry-javascript/blob/11.6.0/CHANGELOG.md#1120
 */
export const withoutDedupe = <T extends NamedIntegration>(defaults: T[]): T[] =>
  defaults.filter(({ name }) => name !== 'Dedupe');

/**
 * Browser-only pins, as data for `sentry.client.config.js` to hand to the
 * integrations it builds.
 * - `session`: SDK 11 starts one session per page load; SDK 10 started one per
 *   navigation as well.
 * - `tracing.instrumentBfcacheRestore`: SDK 11 starts a navigation span when a
 *   page comes back from the back/forward cache; SDK 10 sent nothing for it.
 * - `tracing.webVitals`: SDK 11 reports vitals per soft navigation and per
 *   back/forward-cache restore; SDK 10 reported one set per page. Both need
 *   span streaming, so they only take effect once `traceLifecycle` changes.
 *
 * Not pinned: SDK 11 stopped turning `performance.mark()` and `measure()`
 * entries into spans, and `userTimingIntegration` would bring them back. No
 * script the build emits makes one, so it could only send what third-party
 * scripts and browser extensions mark.
 * @see https://github.com/getsentry/sentry-javascript/blob/11.6.0/MIGRATION.md#page-is-the-default-browser-session-lifecycle-mode
 * @see https://github.com/getsentry/sentry-javascript/blob/11.6.0/MIGRATION.md#web-vitals-are-reported-per-soft-navigation
 * @see https://docs.sentry.io/platforms/javascript/guides/astro/migration/v10-to-v11/#browser-integrations
 */
export const sentryBrowserBaseline = {
  session: { lifecycle: 'route' },
  tracing: {
    instrumentBfcacheRestore: false,
    webVitals: { softNavigations: false, bfcacheNavigations: false },
  },
} as const;

/**
 * What a Session Replay may show: a privacy choice, not an SDK 10 pin. Page
 * text and media are recorded as they are, since the site's content is public
 * and an unmasked replay is far more useful for debugging. What a visitor
 * types is not: the value of every input (the header search box is the only
 * one) is replaced in the browser with one `*` per character before a replay
 * is sent. Masking inputs is also the SDK's default; it is set here so the
 * choice is stated.
 * @see https://docs.sentry.io/platforms/javascript/guides/astro/session-replay/privacy/
 */
export const sentryReplayPrivacy = {
  maskAllText: false,
  blockAllMedia: false,
  maskAllInputs: true,
} as const;
