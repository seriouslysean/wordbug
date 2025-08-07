import {
 afterEach,beforeEach, describe, expect, it, vi,
} from 'vitest';

import { getAdapter } from '~adapters';

describe('adapter factory', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.DICTIONARY_ADAPTER;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.DICTIONARY_ADAPTER = originalEnv;
    } else {
      delete process.env.DICTIONARY_ADAPTER;
    }
    vi.clearAllMocks();
  });

  describe('getAdapter', () => {
    it('returns wordnik adapter by default', () => {
      delete process.env.DICTIONARY_ADAPTER;

      const adapter = getAdapter();

      expect(adapter).toBeDefined();
      expect(adapter.name).toBe('wordnik');
      expect(typeof adapter.fetchWordData).toBe('function');
      expect(typeof adapter.transformToWordData).toBe('function');
      expect(typeof adapter.transformWordData).toBe('function');
      expect(typeof adapter.isValidResponse).toBe('function');
    });

    it('returns wordnik adapter when explicitly configured', () => {
      process.env.DICTIONARY_ADAPTER = 'wordnik';

      const adapter = getAdapter();

      expect(adapter.name).toBe('wordnik');
    });

    it('handles case insensitive adapter names', () => {
      process.env.DICTIONARY_ADAPTER = 'WORDNIK';

      const adapter = getAdapter();

      expect(adapter.name).toBe('wordnik');
    });

    it('throws error for unsupported adapter', () => {
      process.env.DICTIONARY_ADAPTER = 'unsupported-adapter';

      expect(() => getAdapter()).toThrow('Unsupported dictionary adapter');
    });

    it('returns wordnik adapter for empty adapter name (falls back to default)', () => {
      process.env.DICTIONARY_ADAPTER = '';

      const adapter = getAdapter();

      expect(adapter.name).toBe('wordnik');
    });

    it('logs adapter selection', () => {
      const mockLogger = vi.hoisted(() => ({
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      }));

      vi.mock('~utils-client/logger', () => ({
        logger: mockLogger,
      }));

      process.env.DICTIONARY_ADAPTER = 'wordnik';

      getAdapter();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Using dictionary adapter',
        { adapter: 'wordnik' },
      );
    });
  });

  describe('adapter interface compliance', () => {
    it('returned adapter implements DictionaryAdapter interface', () => {
      const adapter = getAdapter();

      expect(adapter).toHaveProperty('name');
      expect(adapter).toHaveProperty('fetchWordData');
      expect(adapter).toHaveProperty('transformToWordData');
      expect(adapter).toHaveProperty('transformWordData');
      expect(adapter).toHaveProperty('isValidResponse');

      expect(typeof adapter.fetchWordData).toBe('function');
      expect(typeof adapter.transformToWordData).toBe('function');
      expect(typeof adapter.transformWordData).toBe('function');
      expect(typeof adapter.isValidResponse).toBe('function');

      expect(typeof adapter.name).toBe('string');
    });

    it('adapter methods have correct signatures', () => {
      const adapter = getAdapter();

      expect(adapter.fetchWordData.length).toBeGreaterThanOrEqual(1);
      expect(adapter.transformToWordData.length).toBe(2);
      expect(adapter.transformWordData.length).toBe(1);
      expect(adapter.isValidResponse.length).toBe(1);
    });
  });
});