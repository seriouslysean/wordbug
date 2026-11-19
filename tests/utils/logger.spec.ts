import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { config, logger } from '#astro-utils/logger';

declare const mockEnv: Record<string, string | boolean | undefined>;

// Vitest hoists vi.mock above the imports, so the logger loads this mock
vi.mock('@sentry/astro', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  withScope: vi.fn((callback) => {
    const scope = {
      setLevel: vi.fn(),
      setExtra: vi.fn(),
    };
    callback(scope);
    return scope;
  }),
}));

const createConsoleSpy = () => ({
  debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
  info: vi.spyOn(console, 'info').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
});

type ConsoleSpy = ReturnType<typeof createConsoleSpy>;

describe('logger', () => {
  const ctx: { consoleSpy: ConsoleSpy } = { consoleSpy: createConsoleSpy() };

  beforeEach(() => {
    ctx.consoleSpy = createConsoleSpy();

    const importMock = vi.fn(() => Promise.resolve({
      logError: vi.fn(),
    }));
    vi.doMock('#astro-utils/sentry-client', () => importMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('config', () => {
    it('exports configuration object', () => {
      expect(config).toHaveProperty('isDev');
      expect(config).toHaveProperty('sentryEnabled');
      expect(config).toHaveProperty('version');
    });
  });

  describe('console behavior', () => {
    it.each(['debug', 'info', 'warn', 'error'] as const)(
      'writes %s calls to the console with their arguments in development',
      (level) => {
        logger[level]('test message', { context: 'data' });

        expect(ctx.consoleSpy[level]).toHaveBeenCalledWith('test message', { context: 'data' });
      },
    );
  });

  describe('sentry integration', () => {
    const loadEnabledLogger = async () => {
      mockEnv.SENTRY_ENABLED = true;
      mockEnv.SENTRY_DSN = 'https://test@sentry.io/123';
      vi.resetModules();
      const { logger: enabledLogger } = await import('#astro-utils/logger');
      const Sentry = await import('@sentry/astro');
      return { enabledLogger, Sentry };
    };

    afterEach(() => {
      mockEnv.SENTRY_ENABLED = false;
      mockEnv.SENTRY_DSN = undefined;
    });

    it('sends errors to Sentry as error-level messages', async () => {
      const { enabledLogger, Sentry } = await loadEnabledLogger();

      enabledLogger.error('test error');

      expect(Sentry.captureMessage).toHaveBeenCalledWith('test error', 'error');
    });

    it('still logs and does not throw when Sentry fails', async () => {
      const { enabledLogger, Sentry } = await loadEnabledLogger();
      vi.mocked(Sentry.withScope).mockImplementationOnce(() => {
        throw new Error('Sentry is down');
      });

      expect(() => enabledLogger.error('test error')).not.toThrow();
      expect(ctx.consoleSpy.error).toHaveBeenCalledWith('test error');
    });
  });
});
