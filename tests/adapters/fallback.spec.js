import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('#utils/logger', () => ({
  logger: mockLogger,
}));

describe('fetchWithFallback', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns primary adapter result when primary succeeds', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
    vi.stubEnv('DICTIONARY_FALLBACK', 'wiktionary');

    const mockResponse = { word: 'test', definitions: [{ text: 'a test', partOfSpeech: 'noun' }], meta: { source: 'Wordnik', attribution: '', url: '' } };

    vi.doMock('#adapters/wordnik', () => ({
      wordnikAdapter: {
        name: 'wordnik',
        fetchWordData: vi.fn().mockResolvedValue(mockResponse),
        transformToWordData: vi.fn(),
        transformWordData: vi.fn(),
        isValidResponse: vi.fn(),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');
    const result = await fetchWithFallback('test');

    expect(result.adapterName).toBe('wordnik');
    expect(result.response).toEqual(mockResponse);
  });

  it('falls back when primary fails and fallback is configured', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', 'wiktionary');

    const fallbackResponse = { word: 'test', definitions: [{ text: 'a test', partOfSpeech: 'noun' }], meta: { source: 'Wiktionary', attribution: '', url: '' } };

    vi.doMock('#adapters/merriam-webster', () => ({
      merriamWebsterAdapter: {
        name: 'merriam-webster',
        fetchWordData: vi.fn().mockRejectedValue(new Error('Word not found')),
        transformToWordData: vi.fn(),
        transformWordData: vi.fn(),
        isValidResponse: vi.fn(),
      },
    }));

    vi.doMock('#adapters/wiktionary', () => ({
      wiktionaryAdapter: {
        name: 'wiktionary',
        fetchWordData: vi.fn().mockResolvedValue(fallbackResponse),
        transformToWordData: vi.fn(),
        transformWordData: vi.fn(),
        isValidResponse: vi.fn(),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');
    const result = await fetchWithFallback('test');

    expect(result.adapterName).toBe('wiktionary');
    expect(result.response).toEqual(fallbackResponse);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Primary adapter failed, trying fallback',
      expect.objectContaining({ primary: 'merriam-webster', fallback: 'wiktionary' }),
    );
  });

  it('throws primary error when fallback is not configured', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
    delete process.env.DICTIONARY_FALLBACK;

    const primaryError = new Error('Word not found');

    vi.doMock('#adapters/wordnik', () => ({
      wordnikAdapter: {
        name: 'wordnik',
        fetchWordData: vi.fn().mockRejectedValue(primaryError),
        transformToWordData: vi.fn(),
        transformWordData: vi.fn(),
        isValidResponse: vi.fn(),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');

    await expect(fetchWithFallback('test')).rejects.toThrow('Word not found');
  });

  it('throws primary error when fallback is "none"', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
    vi.stubEnv('DICTIONARY_FALLBACK', 'none');

    vi.doMock('#adapters/wordnik', () => ({
      wordnikAdapter: {
        name: 'wordnik',
        fetchWordData: vi.fn().mockRejectedValue(new Error('Word not found')),
        transformToWordData: vi.fn(),
        transformWordData: vi.fn(),
        isValidResponse: vi.fn(),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');

    await expect(fetchWithFallback('test')).rejects.toThrow('Word not found');
  });

  it('throws when both primary and fallback fail', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', 'wiktionary');

    vi.doMock('#adapters/merriam-webster', () => ({
      merriamWebsterAdapter: {
        name: 'merriam-webster',
        fetchWordData: vi.fn().mockRejectedValue(new Error('MW: not found')),
        transformToWordData: vi.fn(),
        transformWordData: vi.fn(),
        isValidResponse: vi.fn(),
      },
    }));

    vi.doMock('#adapters/wiktionary', () => ({
      wiktionaryAdapter: {
        name: 'wiktionary',
        fetchWordData: vi.fn().mockRejectedValue(new Error('Wiktionary: not found')),
        transformToWordData: vi.fn(),
        transformWordData: vi.fn(),
        isValidResponse: vi.fn(),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');

    await expect(fetchWithFallback('test')).rejects.toThrow('Wiktionary: not found');
  });

  it('throws primary error when fallback is empty string', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
    vi.stubEnv('DICTIONARY_FALLBACK', '');

    vi.doMock('#adapters/wordnik', () => ({
      wordnikAdapter: {
        name: 'wordnik',
        fetchWordData: vi.fn().mockRejectedValue(new Error('Word not found')),
        transformToWordData: vi.fn(),
        transformWordData: vi.fn(),
        isValidResponse: vi.fn(),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');

    await expect(fetchWithFallback('test')).rejects.toThrow('Word not found');
  });
});
