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
const UNEXPECTED_SHAPE = 'Merriam-Webster returned an unexpected response shape for "test"';
const BROKEN_CONTRACT = 'merriam-webster returned an unexpected response shape for "test"';

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
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', 'wiktionary');

    const mockResponse = { word: 'test', definitions: [{ text: 'a test', partOfSpeech: 'noun' }], meta: { source: 'Merriam-Webster' } };

    vi.doMock('#adapters/merriam-webster', () => ({
      merriamWebsterAdapter: {
        name: 'merriam-webster',
        fetchWordData: vi.fn().mockResolvedValue(mockResponse),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');
    const result = await fetchWithFallback('test');

    expect(result.adapterName).toBe('merriam-webster');
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
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    delete process.env.DICTIONARY_FALLBACK;

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
  });

  it('throws primary error when fallback is "none"', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', 'none');

    vi.doMock('#adapters/merriam-webster', () => ({
      merriamWebsterAdapter: {
        name: 'merriam-webster',
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

  // Two adapters are registered, so a chain of three names one of them twice.
  // The chain does not care: it asks each name in turn.
  it('tries each fallback in chain order until one succeeds', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', 'merriam-webster,wiktionary');

    const wiktionaryResponse = { word: 'test', definitions: [{ text: 'a test', partOfSpeech: 'noun' }], meta: { source: 'Wiktionary' } };

    vi.doMock('#adapters/merriam-webster', () => ({
      merriamWebsterAdapter: {
        name: 'merriam-webster',
        fetchWordData: vi.fn()
          .mockRejectedValueOnce(new Error('MW: not found'))
          .mockRejectedValueOnce(new Error('MW: still not found')),
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
      expect.objectContaining({ adapter: 'merriam-webster', error: 'MW: not found', fallback: 'merriam-webster' }),
    );
    expect(mockLogger.warn).toHaveBeenNthCalledWith(2,
      'Adapter failed, trying fallback',
      expect.objectContaining({ adapter: 'merriam-webster', error: 'MW: still not found', fallback: 'wiktionary' }),
    );
  });

  it('returns first successful fallback in chain', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', 'wiktionary,merriam-webster');

    const wiktionaryResponse = { word: 'test', definitions: [{ text: 'a test', partOfSpeech: 'noun' }], meta: { source: 'Wiktionary' } };
    const merriamWebster = vi.fn().mockRejectedValue(new Error('MW: not found'));

    vi.doMock('#adapters/merriam-webster', () => ({
      merriamWebsterAdapter: { name: 'merriam-webster', fetchWordData: merriamWebster },
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
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    // The link after the one that answered is never asked
    expect(merriamWebster).toHaveBeenCalledTimes(1);
  });

  it('keeps every failure in chain order when all fallbacks fail', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', 'merriam-webster,wiktionary');

    vi.doMock('#adapters/merriam-webster', () => ({
      merriamWebsterAdapter: {
        name: 'merriam-webster',
        fetchWordData: vi.fn()
          .mockRejectedValueOnce(new Error('MW: not found'))
          .mockRejectedValueOnce(new Error('MW: still not found')),
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
    expect(aggregateErrors(error).map(e => e.message)).toEqual(['MW: not found', 'MW: still not found', 'Wiktionary: not found']);
  });

  it.each([
    ['a rate limit', RATE_LIMITED],
    ['an unexpected shape', UNEXPECTED_SHAPE],
  ])('does not let a fallback 404 mask %s from the primary', async (_label, primaryMessage) => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', 'wiktionary');
    const primaryError = new Error(primaryMessage);
    const fallbackError = new Error(NOT_FOUND);
    mockFailingAdapter('#adapters/merriam-webster', 'merriamWebsterAdapter', 'merriam-webster', primaryError);
    mockFailingAdapter('#adapters/wiktionary', 'wiktionaryAdapter', 'wiktionary', fallbackError);

    const { fetchWithFallback } = await import('#adapters');

    const error = await catchError(fetchWithFallback('test'));
    expect(error).toBeInstanceOf(AggregateError);
    expect(aggregateErrors(error)).toEqual([primaryError, fallbackError]);
    expect(error.message).toBe(
      `All dictionary adapters failed for "test": merriam-webster: ${primaryMessage} | wiktionary: ${NOT_FOUND}`,
    );
  });

  // "wordnik" was a valid name once. Resolved only when its turn came, it
  // was silent for every word the primary had.
  it.each([
    ['the only fallback', 'wordnik'],
    ['after a valid one', 'wiktionary, wordnik'],
  ])('refuses a fallback name that is no adapter before fetching anything, when it is %s', async (_, value) => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', value);
    const primary = vi.fn().mockResolvedValue({ word: 'test', definitions: [{ text: 'a test', partOfSpeech: 'noun' }], meta: { source: 'Merriam-Webster' } });
    vi.doMock('#adapters/merriam-webster', () => ({
      merriamWebsterAdapter: { name: 'merriam-webster', fetchWordData: primary },
    }));

    const { fetchWithFallback } = await import('#adapters');

    const error = await catchError(fetchWithFallback('test'));
    expect(error).not.toBeInstanceOf(AggregateError);
    expect(error.message).toBe(
      'DICTIONARY_FALLBACK names an adapter that does not exist. Unknown adapter: wordnik. Valid adapters: merriam-webster, wiktionary',
    );
    // The primary has the word, and is never asked
    expect(primary).not.toHaveBeenCalled();
  });

  it('names the valid adapters when the primary is not one', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
    vi.stubEnv('DICTIONARY_FALLBACK', 'wiktionary');

    const { fetchWithFallback } = await import('#adapters');

    await expect(fetchWithFallback('test')).rejects.toThrow('Unknown adapter: wordnik. Valid adapters: merriam-webster, wiktionary');
  });

  it.each([
    ['empty, as CI exports an unset repository variable', ''],
    ['blank', '  '],
  ])('defaults to the wiktionary fallback when DICTIONARY_FALLBACK is %s', async (_, value) => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', value);
    mockFailingAdapter('#adapters/merriam-webster', 'merriamWebsterAdapter', 'merriam-webster', new Error(RATE_LIMITED));

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
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', value);
    mockFailingAdapter('#adapters/merriam-webster', 'merriamWebsterAdapter', 'merriam-webster', new Error(RATE_LIMITED));

    const { fetchWithFallback } = await import('#adapters');

    const error = await catchError(fetchWithFallback('test'));
    expect(error).not.toBeInstanceOf(AggregateError);
    expect(error.message).toBe(RATE_LIMITED);
  });

  it('logs which adapter failed and why before trying the next', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', 'wiktionary,merriam-webster');
    vi.doMock('#adapters/merriam-webster', () => ({
      merriamWebsterAdapter: {
        name: 'merriam-webster',
        fetchWordData: vi.fn().mockRejectedValueOnce(new Error(RATE_LIMITED)).mockRejectedValueOnce(new Error(NOT_FOUND)),
      },
    }));
    mockFailingAdapter('#adapters/wiktionary', 'wiktionaryAdapter', 'wiktionary', new Error(NOT_FOUND));

    const { fetchWithFallback } = await import('#adapters');
    await catchError(fetchWithFallback('test'));

    expect(mockLogger.warn.mock.calls).toEqual([
      ['Adapter failed, trying fallback', { adapter: 'merriam-webster', error: RATE_LIMITED, fallback: 'wiktionary', word: 'test' }],
      ['Adapter failed, trying fallback', { adapter: 'wiktionary', error: NOT_FOUND, fallback: 'merriam-webster', word: 'test' }],
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

  it('throws an error of its own, naming what the dictionary calls the word, when no definition is displayable', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', 'none');

    // Keeps the contract, but a label is not a part of speech, so no page could show it
    vi.doMock('#adapters/merriam-webster', () => ({
      merriamWebsterAdapter: {
        name: 'merriam-webster',
        fetchWordData: vi.fn().mockResolvedValue({ word: 'test', definitions: [{ text: 'A prefix', label: 'affix' }], meta: { source: 'Merriam-Webster' } }),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');

    const { NoDisplayableDefinitionError } = await import('#utils/adapter-utils');

    const error = await catchError(fetchWithFallback('test'));
    expect(error).toBeInstanceOf(NoDisplayableDefinitionError);
    expect(error.message).toBe('merriam-webster has "test" only as: affix. A page shows a definition by its part of speech, and none of these is one.');
  });

  it('falls through when the primary breaks the canonical contract', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', 'wiktionary');

    // Text fragments break the contract even though a page could display them
    const brokenResponse = { word: 'test', definitions: [{ text: ['a', 'test'], partOfSpeech: 'noun' }], meta: { source: 'Merriam-Webster' } };
    const fallbackResponse = { word: 'test', definitions: [{ text: 'a test', partOfSpeech: 'noun' }], meta: { source: 'Wiktionary' } };

    vi.doMock('#adapters/merriam-webster', () => ({
      merriamWebsterAdapter: {
        name: 'merriam-webster',
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
      ['Adapter failed, trying fallback', { adapter: 'merriam-webster', error: BROKEN_CONTRACT, fallback: 'wiktionary', word: 'test' }],
    ]);
  });

  it('refuses a response for a word other than the one requested', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', 'none');

    vi.doMock('#adapters/merriam-webster', () => ({
      merriamWebsterAdapter: {
        name: 'merriam-webster',
        fetchWordData: vi.fn().mockResolvedValue({ word: 'Test', definitions: [{ text: 'a test', partOfSpeech: 'noun' }], meta: { source: 'Merriam-Webster' } }),
      },
    }));

    const { fetchWithFallback } = await import('#adapters');

    await expect(fetchWithFallback('test')).rejects.toThrow(BROKEN_CONTRACT);
  });

  it('keeps a broken contract in the aggregate error when the chain is exhausted', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('DICTIONARY_FALLBACK', 'wiktionary');

    vi.doMock('#adapters/merriam-webster', () => ({
      merriamWebsterAdapter: {
        name: 'merriam-webster',
        fetchWordData: vi.fn().mockResolvedValue({ word: 'test', definitions: [{ text: 'a test', partOfSpeech: 'noun', examples: [] }], meta: { source: 'Merriam-Webster' } }),
      },
    }));
    const fallbackError = new Error(NOT_FOUND);
    mockFailingAdapter('#adapters/wiktionary', 'wiktionaryAdapter', 'wiktionary', fallbackError);

    const { fetchWithFallback } = await import('#adapters');

    const error = await catchError(fetchWithFallback('test'));
    expect(error).toBeInstanceOf(AggregateError);
    expect(aggregateErrors(error).map(e => e.message)).toEqual([BROKEN_CONTRACT, NOT_FOUND]);
    expect(error.message).toBe(`All dictionary adapters failed for "test": merriam-webster: ${BROKEN_CONTRACT} | wiktionary: ${NOT_FOUND}`);
  });
});

// A dictionary that lists no definition for the headword has not changed its
// API: it does not have the word. One that lists definitions but gives none of
// them text has. Real adapters, fetch stubbed.
describe('fetchWithFallback when a dictionary answers with no definitions', () => {
  // null: Wiktionary does not have the word
  const answers: { wiktionary: unknown; merriamWebster: unknown } = { wiktionary: null, merriamWebster: null };

  beforeEach(() => {
    // The tests above replace adapters with vi.doMock, which outlives them
    for (const adapter of ['#adapters/merriam-webster', '#adapters/wiktionary']) {
      vi.doUnmock(adapter);
    }
    vi.resetModules();
    answers.wiktionary = null;
    vi.stubEnv('MERRIAM_WEBSTER_API_KEY', 'test-key');
    vi.stubEnv('MERRIAM_WEBSTER_API_URL', 'https://mw.test/api/v3/references');
    vi.stubGlobal('fetch', vi.fn<typeof fetch>((url) => {
      if (String(url).startsWith('https://mw.test')) {
        return Promise.resolve(new Response(JSON.stringify(answers.merriamWebster), { status: 200 }));
      }
      if (answers.wiktionary === null) {
        return Promise.resolve(new Response('{}', { status: 404, statusText: 'Not Found' }));
      }
      return Promise.resolve(new Response(JSON.stringify(answers.wiktionary), { status: 200 }));
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

  // Deliberate, not a side effect: Wiktionary's HTML is decoded before the
  // guard sees it, so an encoded tag arrives tag-shaped. Text that looks like
  // markup is refused whatever it was in the source; the word comes from the
  // next adapter and the fault is kept. See Enforcement in docs/technical.md.
  it('refuses a Wiktionary definition whose character references decode to a tag', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wiktionary');
    vi.stubEnv('DICTIONARY_FALLBACK', 'merriam-webster');
    answers.wiktionary = { en: [{ partOfSpeech: 'Noun', language: 'English', definitions: [{ definition: 'Marked &lt;b&gt;critical&lt;/b&gt; in the source' }] }] };
    answers.merriamWebster = [];
    const { fetchWithFallback } = await import('#adapters');
    const { isWordNotFound } = await import('#utils/adapter-utils');

    const error = await catchError(fetchWithFallback('test'));

    expect(aggregateErrors(error)[0]?.message).toBe('wiktionary returned an unexpected response shape for "test"');
    expect(isWordNotFound(error)).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith('Adapter failed, trying fallback', {
      adapter: 'wiktionary',
      error: 'wiktionary returned an unexpected response shape for "test"',
      fallback: 'merriam-webster',
      word: 'test',
    });
  });

  it('keeps a decoded bracket that is not a tag', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wiktionary');
    vi.stubEnv('DICTIONARY_FALLBACK', 'none');
    answers.wiktionary = { en: [{ partOfSpeech: 'Noun', language: 'English', definitions: [{ definition: 'Below range (&lt;20 mg/dL) &amp; falling' }] }] };
    const { fetchWithFallback } = await import('#adapters');

    const { response } = await fetchWithFallback('test');

    expect(response.definitions.map(definition => definition.text)).toEqual(['Below range (<20 mg/dL) & falling']);
  });

  it('reports a Wiktionary answer whose every definition lacks text as an unexpected shape', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'wiktionary');
    vi.stubEnv('DICTIONARY_FALLBACK', 'none');
    answers.wiktionary = { en: [{ partOfSpeech: 'Noun', language: 'English', definitions: [{ definition: '' }, { definition: '  ' }] }] };
    const { fetchWithFallback } = await import('#adapters');
    const { isWordNotFound } = await import('#utils/adapter-utils');

    const error = await catchError(fetchWithFallback('test'));
    expect(isWordNotFound(error)).toBe(false);
    expect(error.message).toBe('Wiktionary returned an unexpected response shape for "test"');
  });
});
