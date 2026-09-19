import {
  afterEach, beforeEach, describe, expect, it, vi,
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

const RATE_LIMITED = 'Rate limit exceeded. Please try again later.';
const NOT_FOUND = 'Word "test" not found in dictionary. Please check the spelling.';
const UNEXPECTED_SHAPE = 'Wordnik returned an unexpected response shape for "test"';
const BROKEN_CONTRACT = 'wordnik returned an unexpected response shape for "test"';

const mockFailingAdapter = (
  modulePath: string,
  exportName: string,
  name: string,
  error: unknown,
): void => {
  vi.doMock(modulePath, () => ({
    [exportName]: {
      name,
      fetchWordData: vi.fn().mockRejectedValue(error),
    },
  }));
};

const catchError = async (promise: Promise<unknown>): Promise<Error> => {
  try {
    await promise;
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
    throw new Error(String(error), { cause: error });
  }
  throw new Error('expected a rejection');
};

const aggregateErrors = (error: Error): Error[] => {
  if (!(error instanceof AggregateError)) {
    throw new Error('expected an aggregate error');
  }
  const errors = error.errors.filter((entry): entry is Error => entry instanceof Error);
  if (errors.length !== error.errors.length) {
    throw new Error('aggregate error contains a non-Error entry');
  }
  return errors;
};

describe('fetchWithFallback', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns primary adapter result when primary succeeds', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
    vi.stubEnv('DICTIONARY_FALLBACK', 'wiktionary');

    const mockResponse = { word: 'test', definitions: [{ text: 'a test', partOfSpeech: 'noun' }], meta: { source: 'Wordnik' } };

    vi.doMock('#adapters/wordnik', () => ({
      wordnikAdapter: {
        name: 'wordnik',
        fetchWordData: vi.fn().mockResolvedValue(mockResponse),
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

    const fallbackResponse = { word: 'test', definitions: [{ text: 'a test', partOfSpeech: 'noun' }], meta: { source: 'Wiktionary' } };

    vi.doMock('#adapters/merriam-webster', () => ({
      merriamWebsterAdapter: {
        name: 'merriam-webster',
        fetchWordData: vi.fn().mockRejectedValue(new Error('Word not found')),
      },
    }));

    vi.doMock('#adapters/wiktionary', () => ({
      wiktionaryAdapter: {
        name: 'wiktionary',
        fetchWordData: vi.fn().mockResolvedValue(fallbackResponse),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');
    const result = await fetchWithFallback('test');

    expect(result.adapterName).toBe('wiktionary');
    expect(result.response).toEqual(fallbackResponse);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Adapter failed, trying fallback',
      expect.objectContaining({ adapter: 'merriam-webster', fallback: 'wiktionary' }),
    );
  });

  it('defaults to wiktionary fallback when DICTIONARY_FALLBACK is unset', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
    delete process.env.DICTIONARY_FALLBACK;

    const fallbackResponse = { word: 'test', definitions: [{ text: 'a test', partOfSpeech: 'noun' }], meta: { source: 'Wiktionary' } };

    vi.doMock('#adapters/wordnik', () => ({
      wordnikAdapter: {
        name: 'wordnik',
        fetchWordData: vi.fn().mockRejectedValue(new Error('Word not found')),
      },
    }));

    vi.doMock('#adapters/wiktionary', () => ({
      wiktionaryAdapter: {
        name: 'wiktionary',
        fetchWordData: vi.fn().mockResolvedValue(fallbackResponse),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');
    const result = await fetchWithFallback('test');

    expect(result.adapterName).toBe('wiktionary');
  });

  it('throws primary error when fallback is "none"', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
    vi.stubEnv('DICTIONARY_FALLBACK', 'none');

    vi.doMock('#adapters/wordnik', () => ({
      wordnikAdapter: {
        name: 'wordnik',
        fetchWordData: vi.fn().mockRejectedValue(new Error('Word not found')),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');

    const error = await catchError(fetchWithFallback('test'));
    expect(error).not.toBeInstanceOf(AggregateError);
    expect(error.message).toBe('Word not found');
  });

  it('throws one error naming both failures when primary and fallback fail', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', 'wiktionary');

    vi.doMock('#adapters/merriam-webster', () => ({
      merriamWebsterAdapter: {
        name: 'merriam-webster',
        fetchWordData: vi.fn().mockRejectedValue(new Error('MW: not found')),
      },
    }));

    vi.doMock('#adapters/wiktionary', () => ({
      wiktionaryAdapter: {
        name: 'wiktionary',
        fetchWordData: vi.fn().mockRejectedValue(new Error('Wiktionary: not found')),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');

    await expect(fetchWithFallback('test')).rejects.toThrow(
      'All dictionary adapters failed for "test": merriam-webster: MW: not found | wiktionary: Wiktionary: not found',
    );
  });

  it('tries each fallback in chain order until one succeeds', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', 'wordnik,wiktionary');

    const wiktionaryResponse = { word: 'test', definitions: [{ text: 'a test', partOfSpeech: 'noun' }], meta: { source: 'Wiktionary' } };

    vi.doMock('#adapters/merriam-webster', () => ({
      merriamWebsterAdapter: {
        name: 'merriam-webster',
        fetchWordData: vi.fn().mockRejectedValue(new Error('MW: not found')),
      },
    }));

    vi.doMock('#adapters/wordnik', () => ({
      wordnikAdapter: {
        name: 'wordnik',
        fetchWordData: vi.fn().mockRejectedValue(new Error('Wordnik: not found')),
      },
    }));

    vi.doMock('#adapters/wiktionary', () => ({
      wiktionaryAdapter: {
        name: 'wiktionary',
        fetchWordData: vi.fn().mockResolvedValue(wiktionaryResponse),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');
    const result = await fetchWithFallback('test');

    expect(result.adapterName).toBe('wiktionary');
    expect(result.response).toEqual(wiktionaryResponse);
    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenNthCalledWith(1,
      'Adapter failed, trying fallback',
      expect.objectContaining({ adapter: 'merriam-webster', fallback: 'wordnik' }),
    );
    expect(mockLogger.warn).toHaveBeenNthCalledWith(2,
      'Adapter failed, trying fallback',
      expect.objectContaining({ adapter: 'wordnik', fallback: 'wiktionary' }),
    );
  });

  it('returns first successful fallback in chain', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', 'wordnik,wiktionary');

    const wordnikResponse = { word: 'test', definitions: [{ text: 'a test', partOfSpeech: 'noun' }], meta: { source: 'Wordnik' } };

    vi.doMock('#adapters/merriam-webster', () => ({
      merriamWebsterAdapter: {
        name: 'merriam-webster',
        fetchWordData: vi.fn().mockRejectedValue(new Error('MW: not found')),
      },
    }));

    vi.doMock('#adapters/wordnik', () => ({
      wordnikAdapter: {
        name: 'wordnik',
        fetchWordData: vi.fn().mockResolvedValue(wordnikResponse),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');
    const result = await fetchWithFallback('test');

    expect(result.adapterName).toBe('wordnik');
    expect(result.response).toEqual(wordnikResponse);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
  });

  it('keeps every failure in chain order when all fallbacks fail', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', 'wordnik,wiktionary');

    vi.doMock('#adapters/merriam-webster', () => ({
      merriamWebsterAdapter: {
        name: 'merriam-webster',
        fetchWordData: vi.fn().mockRejectedValue(new Error('MW: not found')),
      },
    }));

    vi.doMock('#adapters/wordnik', () => ({
      wordnikAdapter: {
        name: 'wordnik',
        fetchWordData: vi.fn().mockRejectedValue(new Error('Wordnik: not found')),
      },
    }));

    vi.doMock('#adapters/wiktionary', () => ({
      wiktionaryAdapter: {
        name: 'wiktionary',
        fetchWordData: vi.fn().mockRejectedValue(new Error('Wiktionary: not found')),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');

    const error = await catchError(fetchWithFallback('test'));
    expect(error).toBeInstanceOf(AggregateError);
    expect(aggregateErrors(error).map(e => e.message)).toEqual(['MW: not found', 'Wordnik: not found', 'Wiktionary: not found']);
  });

  it.each([
    ['a rate limit', RATE_LIMITED],
    ['an unexpected shape', UNEXPECTED_SHAPE],
  ])('does not let a fallback 404 mask %s from the primary', async (_label, primaryMessage) => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
    vi.stubEnv('DICTIONARY_FALLBACK', 'wiktionary');
    const primaryError = new Error(primaryMessage);
    const fallbackError = new Error(NOT_FOUND);
    mockFailingAdapter('#adapters/wordnik', 'wordnikAdapter', 'wordnik', primaryError);
    mockFailingAdapter('#adapters/wiktionary', 'wiktionaryAdapter', 'wiktionary', fallbackError);

    const { fetchWithFallback } = await import('#adapters');

    const error = await catchError(fetchWithFallback('test'));
    expect(error).toBeInstanceOf(AggregateError);
    expect(aggregateErrors(error)).toEqual([primaryError, fallbackError]);
    expect(error.message).toBe(
      `All dictionary adapters failed for "test": wordnik: ${primaryMessage} | wiktionary: ${NOT_FOUND}`,
    );
  });

  it('reports an unknown fallback adapter alongside the primary failure', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
    vi.stubEnv('DICTIONARY_FALLBACK', 'nonesuch');
    mockFailingAdapter('#adapters/wordnik', 'wordnikAdapter', 'wordnik', new Error(RATE_LIMITED));

    const { fetchWithFallback } = await import('#adapters');

    await expect(fetchWithFallback('test')).rejects.toThrow(
      `All dictionary adapters failed for "test": wordnik: ${RATE_LIMITED} | nonesuch: Unknown adapter: nonesuch`,
    );
  });

  it.each([
    ['empty, as CI exports an unset repository variable', ''],
    ['blank', '  '],
  ])('defaults to the wiktionary fallback when DICTIONARY_FALLBACK is %s', async (_, value) => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
    vi.stubEnv('DICTIONARY_FALLBACK', value);
    mockFailingAdapter('#adapters/wordnik', 'wordnikAdapter', 'wordnik', new Error(RATE_LIMITED));

    const fallbackResponse = { word: 'test', definitions: [{ text: 'a test', partOfSpeech: 'noun' }], meta: { source: 'Wiktionary' } };
    vi.doMock('#adapters/wiktionary', () => ({
      wiktionaryAdapter: {
        name: 'wiktionary',
        fetchWordData: vi.fn().mockResolvedValue(fallbackResponse),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');
    const result = await fetchWithFallback('test');

    expect(result.adapterName).toBe('wiktionary');
  });

  it.each(['NONE', ' None '])('treats DICTIONARY_FALLBACK=%j as no fallback', async (value) => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
    vi.stubEnv('DICTIONARY_FALLBACK', value);
    mockFailingAdapter('#adapters/wordnik', 'wordnikAdapter', 'wordnik', new Error(RATE_LIMITED));

    const { fetchWithFallback } = await import('#adapters');

    const error = await catchError(fetchWithFallback('test'));
    expect(error).not.toBeInstanceOf(AggregateError);
    expect(error.message).toBe(RATE_LIMITED);
  });

  it('logs which adapter failed and why before trying the next', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
    vi.stubEnv('DICTIONARY_FALLBACK', 'merriam-webster,wiktionary');
    mockFailingAdapter('#adapters/wordnik', 'wordnikAdapter', 'wordnik', new Error(RATE_LIMITED));
    mockFailingAdapter('#adapters/merriam-webster', 'merriamWebsterAdapter', 'merriam-webster', new Error(NOT_FOUND));
    mockFailingAdapter('#adapters/wiktionary', 'wiktionaryAdapter', 'wiktionary', new Error(NOT_FOUND));

    const { fetchWithFallback } = await import('#adapters');
    await catchError(fetchWithFallback('test'));

    expect(mockLogger.warn.mock.calls).toEqual([
      ['Adapter failed, trying fallback', { adapter: 'wordnik', error: RATE_LIMITED, fallback: 'merriam-webster', word: 'test' }],
      ['Adapter failed, trying fallback', { adapter: 'merriam-webster', error: NOT_FOUND, fallback: 'wiktionary', word: 'test' }],
    ]);
  });

  it('falls through when the primary answers with text but no part of speech', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', 'wiktionary');

    // No page could display this, so it is not a usable answer
    const unlabelledResponse = { word: 'test', definitions: [{ text: 'Charles Francis 1900-1985' }], meta: { source: 'Merriam-Webster' } };
    const fallbackResponse = { word: 'test', definitions: [{ text: 'a test', partOfSpeech: 'noun' }], meta: { source: 'Wiktionary' } };

    vi.doMock('#adapters/merriam-webster', () => ({
      merriamWebsterAdapter: {
        name: 'merriam-webster',
        fetchWordData: vi.fn().mockResolvedValue(unlabelledResponse),
      },
    }));

    vi.doMock('#adapters/wiktionary', () => ({
      wiktionaryAdapter: {
        name: 'wiktionary',
        fetchWordData: vi.fn().mockResolvedValue(fallbackResponse),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');
    const result = await fetchWithFallback('test');

    expect(result.adapterName).toBe('wiktionary');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Adapter failed, trying fallback',
      expect.objectContaining({ adapter: 'merriam-webster', fallback: 'wiktionary' }),
    );
  });

  it('throws a named error when the last adapter has no usable definitions', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
    vi.stubEnv('DICTIONARY_FALLBACK', 'none');

    // Keeps the contract, but a label is not a part of speech, so no page could show it
    vi.doMock('#adapters/wordnik', () => ({
      wordnikAdapter: {
        name: 'wordnik',
        fetchWordData: vi.fn().mockResolvedValue({ word: 'test', definitions: [{ text: 'A prefix', label: 'affix' }], meta: { source: 'Wordnik' } }),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');

    await expect(fetchWithFallback('test')).rejects.toThrow('wordnik returned no usable definitions for "test"');
  });
  it('falls through when the primary breaks the canonical contract', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
    vi.stubEnv('DICTIONARY_FALLBACK', 'wiktionary');

    // Text fragments break the contract even though a page could display them
    const brokenResponse = { word: 'test', definitions: [{ text: ['a', 'test'], partOfSpeech: 'noun' }], meta: { source: 'Wordnik' } };
    const fallbackResponse = { word: 'test', definitions: [{ text: 'a test', partOfSpeech: 'noun' }], meta: { source: 'Wiktionary' } };

    vi.doMock('#adapters/wordnik', () => ({
      wordnikAdapter: {
        name: 'wordnik',
        fetchWordData: vi.fn().mockResolvedValue(brokenResponse),
      },
    }));

    vi.doMock('#adapters/wiktionary', () => ({
      wiktionaryAdapter: {
        name: 'wiktionary',
        fetchWordData: vi.fn().mockResolvedValue(fallbackResponse),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');
    const result = await fetchWithFallback('test');

    expect(result).toEqual({ response: fallbackResponse, adapterName: 'wiktionary' });
    expect(mockLogger.warn.mock.calls).toEqual([
      ['Adapter failed, trying fallback', { adapter: 'wordnik', error: BROKEN_CONTRACT, fallback: 'wiktionary', word: 'test' }],
    ]);
  });

  it('refuses a response for a word other than the one requested', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
    vi.stubEnv('DICTIONARY_FALLBACK', 'none');

    vi.doMock('#adapters/wordnik', () => ({
      wordnikAdapter: {
        name: 'wordnik',
        fetchWordData: vi.fn().mockResolvedValue({ word: 'Test', definitions: [{ text: 'a test', partOfSpeech: 'noun' }], meta: { source: 'Wordnik' } }),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');

    await expect(fetchWithFallback('test')).rejects.toThrow(BROKEN_CONTRACT);
  });

  it('keeps a broken contract in the aggregate error when the chain is exhausted', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
    vi.stubEnv('DICTIONARY_FALLBACK', 'wiktionary');

    vi.doMock('#adapters/wordnik', () => ({
      wordnikAdapter: {
        name: 'wordnik',
        fetchWordData: vi.fn().mockResolvedValue({ word: 'test', definitions: [{ text: 'a test', partOfSpeech: 'noun', examples: [] }], meta: { source: 'Wordnik' } }),
      },
    }));
    const fallbackError = new Error(NOT_FOUND);
    mockFailingAdapter('#adapters/wiktionary', 'wiktionaryAdapter', 'wiktionary', fallbackError);

    const { fetchWithFallback } = await import('#adapters');

    const error = await catchError(fetchWithFallback('test'));
    expect(error).toBeInstanceOf(AggregateError);
    expect(aggregateErrors(error).map(e => e.message)).toEqual([BROKEN_CONTRACT, NOT_FOUND]);
    expect(error.message).toBe(`All dictionary adapters failed for "test": wordnik: ${BROKEN_CONTRACT} | wiktionary: ${NOT_FOUND}`);
  });
});

// A dictionary that lists no definition for the headword has not changed its
// API: it does not have the word. One that lists definitions but gives none of
// them text has. Real adapters, fetch stubbed.
describe('fetchWithFallback when a dictionary answers with no definitions', () => {
  const answers: { wordnik: unknown; merriamWebster: unknown } = { wordnik: null, merriamWebster: null };

  beforeEach(() => {
    // The tests above replace adapters with vi.doMock, which outlives them
    for (const adapter of ['#adapters/wordnik', '#adapters/merriam-webster', '#adapters/wiktionary']) {
      vi.doUnmock(adapter);
    }
    vi.resetModules();
    vi.stubEnv('WORDNIK_API_KEY', 'test-key');
    vi.stubEnv('WORDNIK_API_URL', 'https://wordnik.test/v4');
    vi.stubEnv('MERRIAM_WEBSTER_API_KEY', 'test-key');
    vi.stubEnv('MERRIAM_WEBSTER_API_URL', 'https://mw.test/api/v3/references');
    vi.stubGlobal('fetch', vi.fn<typeof fetch>((url) => {
      if (String(url).startsWith('https://wordnik.test')) {
        return Promise.resolve(new Response(JSON.stringify(answers.wordnik), { status: 200 }));
      }
      if (String(url).startsWith('https://mw.test')) {
        return Promise.resolve(new Response(JSON.stringify(answers.merriamWebster), { status: 200 }));
      }
      // Wiktionary does not have the word either
      return Promise.resolve(new Response('{}', { status: 404, statusText: 'Not Found' }));
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('reports a Merriam-Webster entry that is only a cross-reference as not found', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', 'wiktionary');
    answers.merriamWebster = [{
      meta: { id: 'ran', src: 'collegiate' },
      hwi: { hw: 'ran' },
      cxs: [{ cxl: 'past tense of', cxtis: [{ cxt: 'run' }] }],
      shortdef: [],
    }];
    const { fetchWithFallback } = await import('#adapters');
    const { isWordNotFound } = await import('#utils/adapter-utils');

    const error = await catchError(fetchWithFallback('ran'));
    expect(error.message).toContain('merriam-webster: Word "ran" not found in dictionary.');
    expect(isWordNotFound(error)).toBe(true);
  });

  it('reports a Wordnik answer whose every definition lacks text as an unexpected shape', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
    vi.stubEnv('DICTIONARY_FALLBACK', 'none');
    answers.wordnik = [{ partOfSpeech: 'noun' }, { text: '  ', partOfSpeech: 'noun' }];
    const { fetchWithFallback } = await import('#adapters');
    const { isWordNotFound } = await import('#utils/adapter-utils');

    const error = await catchError(fetchWithFallback('test'));
    expect(isWordNotFound(error)).toBe(false);
    expect(error.message).toBe('Wordnik returned an unexpected response shape for "test"');
  });
});
