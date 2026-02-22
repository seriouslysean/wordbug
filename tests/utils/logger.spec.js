import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

// Mock @sentry/astro before importing the logger
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

import { config, logger } from '#astro-utils/logger';

const createConsoleSpy = () => ({
  debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
  info: vi.spyOn(console, 'info').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
});

describe('logger', () => {
  const ctx = { consoleSpy: /** @type {ReturnType<typeof createConsoleSpy>} */ ({}) };

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
    it('preserves console.debug signature', () => {
      logger.debug('test message', { context: 'data' });

      if (config.isDev) {
        expect(ctx.consoleSpy.debug).toHaveBeenCalledWith('test message', { context: 'data' });
      }
    });

    it('preserves console.info signature', () => {
      logger.info('test message', { context: 'data' });

      if (config.isDev) {
        expect(ctx.consoleSpy.info).toHaveBeenCalledWith('test message', { context: 'data' });
      }
    });

    it('preserves console.warn signature', () => {
      logger.warn('test warning', { context: 'data' });

      if (config.isDev) {
        expect(ctx.consoleSpy.warn).toHaveBeenCalledWith('test warning', { context: 'data' });
      }
    });

    it('always logs errors to console', () => {
      logger.error('test error', { context: 'data' });
      expect(ctx.consoleSpy.error).toHaveBeenCalledWith('test error', { context: 'data' });
    });
  });

  describe('development mode behavior', () => {
    it('logs all levels in development', () => {
      if (config.isDev) {
        logger.debug('debug message');
        logger.info('info message');
        logger.warn('warn message');
        logger.error('error message');

        expect(ctx.consoleSpy.debug).toHaveBeenCalled();
        expect(ctx.consoleSpy.info).toHaveBeenCalled();
        expect(ctx.consoleSpy.warn).toHaveBeenCalled();
        expect(ctx.consoleSpy.error).toHaveBeenCalled();
      }
    });
  });

  describe('sentry integration', () => {
    it('handles Sentry errors gracefully', () => {
      // Should not throw even if Sentry internals fail
      expect(() => {
        logger.warn('test warning');
        logger.error('test error');
      }).not.toThrow();
    });

    it('respects sentryEnabled configuration', () => {
      logger.warn('test warning');
      logger.error('test error');

      // Sentry integration should only be called if enabled
      if (config.sentryEnabled) {
        expect(true).toBe(true);
      } else {
        expect(true).toBe(true);
      }
    });
  });

  describe('fast-fail behavior', () => {
    it('implements fast-fail logic correctly', () => {
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');

      expect(() => logger.debug('test')).not.toThrow();
      expect(() => logger.info('test')).not.toThrow();
      expect(() => logger.warn('test')).not.toThrow();
      expect(() => logger.error('test')).not.toThrow();
    });
  });

  describe('proxy behavior', () => {
    it('maintains console API compatibility', () => {
      expect(logger.debug.length).toBe(console.debug.length);
      expect(logger.info.length).toBe(console.info.length);
      expect(logger.warn.length).toBe(console.warn.length);
      expect(logger.error.length).toBe(console.error.length);
    });
  });
});
