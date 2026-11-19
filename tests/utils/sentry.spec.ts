import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';


interface SentEvent {
  level: string | undefined;
  extras: Record<string, unknown>;
  exception?: unknown;
  message?: string;
}

// A stand-in for the Sentry service: events captured inside a scope are kept
// with the level and extras that scope carried, as Sentry would send them.
const sdk = vi.hoisted(() => {
  const events: SentEvent[] = [];
  const current: { scope: { level: string | undefined; extras: Record<string, unknown> } | null } = { scope: null };
  return {
    events,
    init: vi.fn(),
    flush: vi.fn().mockResolvedValue(true),
    withScope: (
      callback: (scope: { setLevel(level: string): void; setExtra(key: string, value: unknown): void }) => void,
    ) => {
      const scope: { level: string | undefined; extras: Record<string, unknown> } = {
        level: undefined,
        extras: {},
      };
      current.scope = scope;
      callback({
        setLevel: (level) => { scope.level = level; },
        setExtra: (key, value) => { scope.extras[key] = value; },
      });
      current.scope = null;
    },
    capture: (detail: Pick<SentEvent, 'exception' | 'message'>) => {
      events.push({
        level: current.scope?.level,
        extras: { ...current.scope?.extras },
        ...detail,
      });
    },
  };
});

vi.mock('@sentry/node', () => ({
  init: sdk.init,
  captureException: (exception: unknown) => sdk.capture({ exception }),
  captureMessage: (message: string) => sdk.capture({ message }),
  flush: sdk.flush,
  withScope: sdk.withScope,
}));

const createConsoleSpy = () => ({
  info: vi.spyOn(console, 'info').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
});
type ConsoleSpy = ReturnType<typeof createConsoleSpy>;

describe('utils/logger (CLI logger with Sentry)', () => {
  const ctx: { consoleSpy: ConsoleSpy } = { consoleSpy: createConsoleSpy() };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    sdk.events.length = 0;
    ctx.consoleSpy = createConsoleSpy();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('when SENTRY_ENABLED is false', () => {
    it('logger.error does not call Sentry APIs', async () => {
      vi.stubEnv('SENTRY_ENABLED', 'false');
      // With a DSN present, so the switch itself is what keeps Sentry off
      vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123');
      const { logger } = await import('#utils/logger');
      const Sentry = await import('@sentry/node');

      logger.error('test error');

      expect(ctx.consoleSpy.error).toHaveBeenCalledWith('test error');
      expect(sdk.events).toEqual([]);
      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it('logger.info outputs to console', async () => {
      vi.stubEnv('SENTRY_ENABLED', 'false');
      const { logger } = await import('#utils/logger');

      logger.info('info message');
      expect(ctx.consoleSpy.info).toHaveBeenCalledWith('info message');
    });
  });

  describe('when SENTRY_ENABLED is true with DSN', () => {
    beforeEach(() => {
      vi.stubEnv('SENTRY_ENABLED', 'true');
      vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123');
      vi.stubEnv('SENTRY_ENVIRONMENT', 'test');
      vi.stubEnv('SITE_ID', 'test-site');
    });

    it('sends an Error with its context as one error-level event', async () => {
      const { logger } = await import('#utils/logger');
      const err = new Error('test');

      logger.error(err, { tool: 'add-word', count: 42 });

      expect(ctx.consoleSpy.error).toHaveBeenCalled();
      expect(sdk.events).toEqual([
        { level: 'error', extras: { tool: 'add-word', count: 42 }, exception: err },
      ]);
    });

    it('sends a string message as an event', async () => {
      const { logger } = await import('#utils/logger');

      logger.error('something failed');

      expect(sdk.events).toEqual([
        { level: 'error', extras: {}, message: 'something failed' },
      ]);
    });

    it('sends no extras when the second argument is not a plain object', async () => {
      const { logger } = await import('#utils/logger');

      logger.error('msg', 'not an object');

      expect(sdk.events).toEqual([
        { level: 'error', extras: {}, message: 'msg' },
      ]);
    });

    it('initializes Sentry for this deployment without sending private fields', async () => {
      vi.stubEnv('SENTRY_RELEASE', 'site@1.2.3+abc');
      const { logger } = await import('#utils/logger');
      const Sentry = await import('@sentry/node');
      const { sentryBaselineOptions, withoutDedupe } = await import('#utils/sentry-options');

      logger.error('trigger init');

      expect(Sentry.init).toHaveBeenCalledOnce();
      // The whole object, not a subset: an added option (sendDefaultPii) or a dropped one (the
      // dedupe filter, the privacy baseline) must fail here
      expect(Sentry.init).toHaveBeenCalledWith({
        ...sentryBaselineOptions,
        integrations: withoutDedupe,
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
        release: 'site@1.2.3+abc',
        tracesSampleRate: 0,
        initialScope: { tags: { site: 'test-site', runtime: 'cli' } },
      });
    });

    it('logger.warn does not forward to Sentry', async () => {
      const { logger } = await import('#utils/logger');

      logger.warn('a warning');

      expect(ctx.consoleSpy.warn).toHaveBeenCalledWith('a warning');
      expect(sdk.events).toEqual([]);
    });

    it('only initializes Sentry once across multiple error calls', async () => {
      const { logger } = await import('#utils/logger');
      const Sentry = await import('@sentry/node');

      logger.error('first');
      logger.error('second');

      expect(Sentry.init).toHaveBeenCalledOnce();
      expect(sdk.events).toHaveLength(2);
    });
  });

  describe('when SENTRY_ENABLED is true but DSN is missing', () => {
    it('logger.error does not initialize Sentry', async () => {
      vi.stubEnv('SENTRY_ENABLED', 'true');
      vi.stubEnv('SENTRY_DSN', '');
      const { logger } = await import('#utils/logger');
      const Sentry = await import('@sentry/node');

      logger.error('test');
      expect(Sentry.init).not.toHaveBeenCalled();
      expect(sdk.events).toEqual([]);
    });
  });

  describe('flush', () => {
    it('calls Sentry.flush when initialized', async () => {
      vi.stubEnv('SENTRY_ENABLED', 'true');
      vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123');
      const { logger, flush } = await import('#utils/logger');
      const Sentry = await import('@sentry/node');

      logger.error('trigger init');
      await flush();

      expect(Sentry.flush).toHaveBeenCalledWith(2000);
    });

    it('resolves immediately when Sentry is not initialized', async () => {
      vi.stubEnv('SENTRY_ENABLED', 'false');
      const { flush } = await import('#utils/logger');
      const Sentry = await import('@sentry/node');

      const result = await flush();

      expect(result).toBe(true);
      expect(Sentry.flush).not.toHaveBeenCalled();
    });
  });

  describe('exit', () => {
    it('flushes Sentry then calls process.exit', async () => {
      vi.stubEnv('SENTRY_ENABLED', 'true');
      vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit');
      });
      const { logger, exit } = await import('#utils/logger');
      const Sentry = await import('@sentry/node');

      logger.error('fatal error');
      try {
        await exit(1);
      } catch {
        // The mock prevents the test process from terminating.
      }

      expect(Sentry.flush).toHaveBeenCalledWith(2000);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('calls process.exit without flushing when Sentry is disabled', async () => {
      vi.stubEnv('SENTRY_ENABLED', 'false');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit');
      });
      const { exit } = await import('#utils/logger');
      const Sentry = await import('@sentry/node');

      try {
        await exit(0);
      } catch {
        // The mock prevents the test process from terminating.
      }

      expect(Sentry.flush).not.toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('beforeExit hook', () => {
    it('registers a beforeExit handler that flushes Sentry', async () => {
      vi.stubEnv('SENTRY_ENABLED', 'true');
      vi.stubEnv('SENTRY_DSN', 'https://test@sentry.io/123');
      // Capture the handler without registering it on the real test process
      const onSpy = vi.spyOn(process, 'on').mockImplementation(() => process);
      const { logger } = await import('#utils/logger');
      const Sentry = await import('@sentry/node');

      logger.error('trigger init');

      const beforeExitCall = onSpy.mock.calls.find(([event]) => event === 'beforeExit');
      expect(beforeExitCall).toBeDefined();

      const handler = beforeExitCall?.[1];
      if (!handler) {
        throw new Error('beforeExit handler was not captured');
      }
      handler();
      expect(Sentry.flush).toHaveBeenCalledWith(2000);
    });

    it('does not register a beforeExit handler when Sentry is disabled', async () => {
      vi.stubEnv('SENTRY_ENABLED', 'false');
      const onSpy = vi.spyOn(process, 'on').mockImplementation(() => process);
      const { logger } = await import('#utils/logger');

      logger.error('no init');

      const beforeExitCall = onSpy.mock.calls.find(([event]) => event === 'beforeExit');
      expect(beforeExitCall).toBeUndefined();
    });
  });
});
