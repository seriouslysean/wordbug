import {
 afterEach,beforeEach, describe, expect, it, vi,
} from 'vitest';

describe('adapter factory', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.DICTIONARY_ADAPTER;
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.DICTIONARY_ADAPTER = originalEnv;
    } else {
      delete process.env.DICTIONARY_ADAPTER;
    }
  });

  describe('getAdapter', () => {
    it('returns wordnik adapter by default', async () => {
      delete process.env.DICTIONARY_ADAPTER;

      const { getAdapter } = await import('~adapters/factory');
      const adapter = getAdapter();

      expect(adapter).toBeDefined();
      expect(adapter.name).toBe('wordnik');
      expect(typeof adapter.fetchWordData).toBe('function');
      expect(typeof adapter.transformToWordData).toBe('function');
      expect(typeof adapter.transformWordData).toBe('function');
      expect(typeof adapter.isValidResponse).toBe('function');
    });

    it('returns wordnik adapter when explicitly configured', async () => {
      process.env.DICTIONARY_ADAPTER = 'wordnik';

      const { getAdapter } = await import('~adapters/factory');
      const adapter = getAdapter();

      expect(adapter.name).toBe('wordnik');
    });

    it('handles case insensitive adapter names', async () => {
      process.env.DICTIONARY_ADAPTER = 'WORDNIK';

      const { getAdapter } = await import('~adapters/factory');
      const adapter = getAdapter();

      expect(adapter.name).toBe('wordnik');
    });

    it('throws error for unsupported adapter', async () => {
      process.env.DICTIONARY_ADAPTER = 'unsupported-adapter';

      const { getAdapter } = await import('~adapters/factory');

      expect(() => getAdapter()).toThrow('Unsupported dictionary adapter');
    });

    it('returns wordnik adapter for empty adapter name (falls back to default)', async () => {
      process.env.DICTIONARY_ADAPTER = '';

      const { getAdapter } = await import('~adapters/factory');
      const adapter = getAdapter();

      expect(adapter.name).toBe('wordnik');
    });

    it('logs adapter selection', async () => {
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      };

      vi.doMock('~utils-client/logger', () => ({
        logger: mockLogger,
      }));

      process.env.DICTIONARY_ADAPTER = 'wordnik';

      const { getAdapter } = await import('~adapters/factory');
      getAdapter();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Using dictionary adapter',
        { adapter: 'wordnik' },
      );
    });
  });

  describe('adapter interface compliance', () => {
    it('returned adapter implements DictionaryAdapter interface', async () => {
      const { getAdapter } = await import('~adapters/factory');
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

    it('adapter methods have correct signatures', async () => {
      const { getAdapter } = await import('~adapters/factory');
      const adapter = getAdapter();

      expect(adapter.fetchWordData.length).toBeGreaterThanOrEqual(1);
      expect(adapter.transformToWordData.length).toBe(2);
      expect(adapter.transformWordData.length).toBe(1);
      expect(adapter.isValidResponse.length).toBe(1);
    });
  });
});