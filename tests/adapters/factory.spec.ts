import {
 beforeEach, describe, expect, it, vi,
} from 'vitest';

import { getAdapter, getAdapterByName, getAdapterNames } from '#adapters';

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('#utils/logger', () => ({
  logger: mockLogger,
}));

describe('adapter factory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAdapter', () => {
    it('returns wordnik adapter by default', () => {
      delete process.env.DICTIONARY_ADAPTER;

      const adapter = getAdapter();

      expect(adapter).toBeDefined();
      expect(adapter.name).toBe('wordnik');
      expect(typeof adapter.fetchWordData).toBe('function');
    });

    it('returns wordnik adapter when explicitly configured', () => {
      vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');

      const adapter = getAdapter();

      expect(adapter.name).toBe('wordnik');
    });

    it('handles case insensitive adapter names', () => {
      vi.stubEnv('DICTIONARY_ADAPTER', 'WORDNIK');

      const adapter = getAdapter();

      expect(adapter.name).toBe('wordnik');
    });

    it('returns merriam-webster adapter when configured', () => {
      vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');

      const adapter = getAdapter();

      expect(adapter.name).toBe('merriam-webster');
    });

    it('handles case insensitive merriam-webster adapter name', () => {
      vi.stubEnv('DICTIONARY_ADAPTER', 'Merriam-Webster');

      const adapter = getAdapter();

      expect(adapter.name).toBe('merriam-webster');
    });

    it('returns wiktionary adapter when configured', () => {
      vi.stubEnv('DICTIONARY_ADAPTER', 'wiktionary');

      const adapter = getAdapter();

      expect(adapter.name).toBe('wiktionary');
    });

    it('throws error for unsupported adapter', () => {
      vi.stubEnv('DICTIONARY_ADAPTER', 'unsupported-adapter');

      expect(() => getAdapter()).toThrow('Unknown adapter: unsupported-adapter');
    });

    it('returns wordnik adapter for empty adapter name (falls back to default)', () => {
      vi.stubEnv('DICTIONARY_ADAPTER', '');

      const adapter = getAdapter();

      expect(adapter.name).toBe('wordnik');
    });

    it('logs adapter selection', async () => {
      vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
      vi.resetModules();

      const { getAdapter: getAdapterWithMock } = await import('#adapters');
      getAdapterWithMock();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Using dictionary adapter',
        { adapter: 'wordnik' },
      );
    });
  });

  describe('getAdapterByName', () => {
    it('returns wordnik adapter', () => {
      expect(getAdapterByName('wordnik').name).toBe('wordnik');
    });

    it('returns merriam-webster adapter', () => {
      expect(getAdapterByName('merriam-webster').name).toBe('merriam-webster');
    });

    it('returns wiktionary adapter', () => {
      expect(getAdapterByName('wiktionary').name).toBe('wiktionary');
    });

    it('handles case insensitive names', () => {
      expect(getAdapterByName('WORDNIK').name).toBe('wordnik');
      expect(getAdapterByName('Merriam-Webster').name).toBe('merriam-webster');
      expect(getAdapterByName('WIKTIONARY').name).toBe('wiktionary');
    });

    it('throws for unknown adapter name', () => {
      expect(() => getAdapterByName('unknown')).toThrow('Unknown adapter: unknown');
    });
  });

  describe('adapter interface compliance', () => {
    // Rendering reads stored data, never an adapter, so an adapter is only
    // its name and the fetch.
    it.each(getAdapterNames())('%s has a name and fetches, and nothing else', (name) => {
      const adapter = getAdapterByName(name);

      expect(Object.keys(adapter).toSorted()).toEqual(['fetchWordData', 'name']);
      expect(adapter.name).toBe(name);
      expect(typeof adapter.fetchWordData).toBe('function');
    });
  });
});
