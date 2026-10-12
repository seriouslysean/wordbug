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
    // No default: add-word and regenerate-all-words refuse to run without it
    it.each([
      ['unset', undefined],
      ['empty, as CI exports an unset repository variable', ''],
    ])('throws when DICTIONARY_ADAPTER is %s', (_, value) => {
      vi.stubEnv('DICTIONARY_ADAPTER', value);

      expect(() => getAdapter()).toThrow('DICTIONARY_ADAPTER environment variable is required');
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

    // Removed: its terms forbid storing its data, which every site does
    it('no longer knows wordnik', () => {
      vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');

      expect(() => getAdapter()).toThrow('Unknown adapter: wordnik');
      expect(getAdapterNames()).toEqual(['merriam-webster', 'wiktionary']);
    });

    it('logs adapter selection', async () => {
      vi.stubEnv('DICTIONARY_ADAPTER', 'wiktionary');
      vi.resetModules();

      const { getAdapter: getAdapterWithMock } = await import('#adapters');
      getAdapterWithMock();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Using dictionary adapter',
        { adapter: 'wiktionary' },
      );
    });
  });

  describe('getAdapterByName', () => {
    it('returns merriam-webster adapter', () => {
      expect(getAdapterByName('merriam-webster').name).toBe('merriam-webster');
    });

    it('returns wiktionary adapter', () => {
      expect(getAdapterByName('wiktionary').name).toBe('wiktionary');
    });

    it('handles case insensitive names', () => {
      expect(getAdapterByName('Merriam-Webster').name).toBe('merriam-webster');
      expect(getAdapterByName('WIKTIONARY').name).toBe('wiktionary');
    });

    it('throws for unknown adapter name', () => {
      expect(() => getAdapterByName('unknown')).toThrow('Unknown adapter: unknown');
    });

    it('throws for a name that is only a key of Object.prototype', () => {
      expect(() => getAdapterByName('constructor')).toThrow('Unknown adapter: constructor');
      expect(() => getAdapterByName('__proto__')).toThrow('Unknown adapter: __proto__');
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
