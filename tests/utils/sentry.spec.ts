import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

import type { SentryBridge } from '#utils/logger-core';

const sentryMocks = vi.hoisted(() => ({
  withScope: vi.fn<SentryBridge['withScope']>((callback) => {
    const scope = { setLevel: vi.fn(), setExtra: vi.fn() };
    callback(scope);
  }),
}));

// Mock @sentry/node before importing
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
  withScope: sentryMocks.withScope,
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
    ctx.consoleSpy = createConsoleSpy();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('when SENTRY_ENABLED is false', () => {
    it('logger.error does not call Sentry APIs', async () => {
      vi.stubEnv('SENTRY_ENABLED', 'false');
      const { logger } = await import('#utils/logger');
      const Sentry = await import('@sentry/node');

      logger.error('test error');

      expect(ctx.consoleSpy.error).toHaveBeenCalledWith('test error');
      expect(Sentry.withScope).not.toHaveBeenCalled();
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

    it('logger.error initializes Sentry and captures exceptions', async () => {
      const { logger } = await import('#utils/logger');
      const Sentry = await import('@sentry/node');
      const err = new Error('test');

      logger.error(err, { tool: 'add-word' });

      expect(ctx.consoleSpy.error).toHaveBeenCalled();
      expect(Sentry.init).toHaveBeenCalledOnce();
      expect(Sentry.withScope).toHaveBeenCalledOnce();
      expect(Sentry.captureException).toHaveBeenCalledWith(err);
    });

    it('logger.error captures string messages', async () => {
      const { logger } = await import('#utils/logger');
      const Sentry = await import('@sentry/node');

      logger.error('something failed');

      expect(Sentry.captureMessage).toHaveBeenCalledWith('something failed', 'error');
    });

    it('logger.error attaches context as extras on scope', async () => {
      const { logger } = await import('#utils/logger');

      logger.error('err', { foo: 'bar', count: 42 });

      const scopeCallback = sentryMocks.withScope.mock.calls[0]?.[0];
      if (!scopeCallback) {
        throw new Error('withScope callback was not captured');
      }
      const scope = { setLevel: vi.fn(), setExtra: vi.fn() };
      scopeCallback(scope);
      expect(scope.setExtra).toHaveBeenCalledWith('foo', 'bar');
      expect(scope.setExtra).toHaveBeenCalledWith('count', 42);
    });

    it('logger.error skips context when second arg is not a plain object', async () => {
      const { logger } = await import('#utils/logger');
      const Sentry = await import('@sentry/node');

      logger.error('msg', 'not an object');

      const scopeCallback = sentryMocks.withScope.mock.calls[0]?.[0];
      if (!scopeCallback) {
        throw new Error('withScope callback was not captured');
      }
      const scope = { setLevel: vi.fn(), setExtra: vi.fn() };
      scopeCallback(scope);
      expect(scope.setExtra).not.toHaveBeenCalled();
      expect(Sentry.captureMessage).toHaveBeenCalledWith('msg', 'error');
    });

    it('logger.warn does not forward to Sentry', async () => {
      const { logger } = await import('#utils/logger');
      const Sentry = await import('@sentry/node');

      logger.warn('a warning');

      expect(ctx.consoleSpy.warn).toHaveBeenCalledWith('a warning');
      expect(Sentry.withScope).not.toHaveBeenCalled();
    });

    it('only initializes Sentry once across multiple error calls', async () => {
      const { logger } = await import('#utils/logger');
      const Sentry = await import('@sentry/node');

      logger.error('first');
      logger.error('second');

      expect(Sentry.init).toHaveBeenCalledOnce();
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
