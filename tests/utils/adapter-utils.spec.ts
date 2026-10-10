import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BasePartOfSpeech } from '#constants/parts-of-speech';
import type { DictionaryDefinition, DictionaryResponse } from '#types';

import {
  ADAPTER_FETCH_TIMEOUT_MS,
  adapterFetch,
  buildDefinition,
  classifyPartOfSpeech,
  isCanonicalResponse,
  isRateLimited,
  isWordNotFound,
  normalizePOS,
  RateLimitError,
  parseJsonResponse,
  throwOnHttpError,
  throwUnexpectedShape,
  throwWordNotFound,
  buildDictionaryResponse,
  WordNotFoundError,
} from '#utils/adapter-utils';

const TEST_POS_MAP: Readonly<Record<string, BasePartOfSpeech>> = {
  'transitive verb': 'verb',
  'proper noun': 'noun',
};

// Every field of the contract, each holding a valid value. Each malformed
// response below changes exactly one thing about it.
const CANONICAL: DictionaryResponse = {
  word: 'test',
  definitions: [{
    id: 'test',
    partOfSpeech: 'noun',
    text: 'A procedure for critical evaluation',
    references: [{ start: 16, end: 24, url: 'https://example.com/critical' }],
    attributionText: 'from Test',
    sourceDictionary: 'test',
    sourceUrl: 'https://example.com/test',
    examples: ['a test of skill'],
    synonyms: ['trial'],
    antonyms: ['certainty'],
  }],
  meta: { source: 'Test', attribution: 'from Test', url: 'https://example.com/test' },
  headword: { pronunciation: 'test', audio: 'https://example.com/test.mp3', etymology: 'Latin testum' },
};
const [CANONICAL_DEFINITION] = CANONICAL.definitions;
if (!CANONICAL_DEFINITION) {
  throw new Error('Canonical fixture must contain a definition');
}
const withResponse = (changes: Record<string, unknown>) => ({ ...CANONICAL, ...changes });
const withDefinition = (changes: Record<string, unknown>) => ({ ...CANONICAL, definitions: [{ ...CANONICAL_DEFINITION, ...changes }] });
const withMeta = (changes: Record<string, unknown>) => ({ ...CANONICAL, meta: { ...CANONICAL.meta, ...changes } });
const withHeadword = (changes: Record<string, unknown>) => ({ ...CANONICAL, headword: { ...CANONICAL.headword, ...changes } });
const withoutDefinitionField = (field: keyof DictionaryDefinition) => {
  if (!CANONICAL_DEFINITION) {
    throw new Error('Canonical fixture must contain a definition');
  }
  const { [field]: _removed, ...rest } = CANONICAL_DEFINITION;
  return { ...CANONICAL, definitions: [rest] };
};
const httpResponse = (status: number, statusText?: string): Response => new Response(null, { status, statusText });
const getError = (value: unknown): Error => {
  if (value instanceof Error) {
    return value;
  }
  throw new Error(`Expected an Error, got ${String(value)}`);
};

describe('adapter-utils', () => {
  describe('adapterFetch', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('returns the response on success', async () => {
      const mockResponse = { ok: true, status: 200 };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const result = await adapterFetch('https://example.com', 'TestAPI');

      expect(result).toBe(mockResponse);
      expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com', { signal: expect.any(AbortSignal) });
    });

    it('wraps TypeError from DNS/network failure with adapter context', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

      await expect(adapterFetch('https://bad.invalid', 'Merriam-Webster'))
        .rejects.toThrow('Merriam-Webster network request failed: fetch failed');
    });

    it('aborts a request that never responds once the deadline passes', async () => {
      // Stands in for a hung connection: settles only when the caller's signal aborts, as real fetch does
      vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
        if (!init?.signal) {
          reject(new Error('fetch called without an abort signal'));
          return;
        }
        if (init.signal.aborted) {
          reject(init.signal.reason);
          return;
        }
        const signal = init.signal;
        signal.addEventListener('abort', () => reject(signal.reason));
      })));
      // AbortSignal.timeout runs on an internal timer that fake timers cannot advance, so hand back an expired signal
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(
        AbortSignal.abort(new DOMException('The operation was aborted due to timeout', 'TimeoutError')),
      );

      const error = getError(await adapterFetch('https://slow.invalid', 'Wordnik').catch(e => e));

      expect(timeoutSpy).toHaveBeenCalledWith(ADAPTER_FETCH_TIMEOUT_MS);
      expect(error.message).toBe(`Wordnik request timed out after ${ADAPTER_FETCH_TIMEOUT_MS}ms`);
      expect(error.cause).toBeInstanceOf(DOMException);
      if (!(error.cause instanceof DOMException)) {
        throw new Error('Expected a timeout DOMException cause');
      }
      expect(error.cause.name).toBe('TimeoutError');
    });

    it('wraps non-Error throws with adapter context', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue('connection reset'));

      await expect(adapterFetch('https://example.com', 'Wordnik'))
        .rejects.toThrow('Wordnik network request failed: connection reset');
    });
  });

  describe('normalizePOS', () => {
    it('returns base POS unchanged', () => {
      expect(normalizePOS('noun', TEST_POS_MAP)).toBe('noun');
      expect(normalizePOS('verb', TEST_POS_MAP)).toBe('verb');
      expect(normalizePOS('adjective', TEST_POS_MAP)).toBe('adjective');
    });

    it('normalizes case and whitespace before checking', () => {
      expect(normalizePOS('  Noun  ', TEST_POS_MAP)).toBe('noun');
      expect(normalizePOS('VERB', TEST_POS_MAP)).toBe('verb');
    });

    it('ignores trailing punctuation, as some dictionaries end labels with a period', () => {
      expect(normalizePOS('noun.', TEST_POS_MAP)).toBe('noun');
      expect(normalizePOS('transitive verb.', TEST_POS_MAP)).toBe('verb');
    });

    it('maps known variants via the provided map', () => {
      expect(normalizePOS('transitive verb', TEST_POS_MAP)).toBe('verb');
      expect(normalizePOS('proper noun', TEST_POS_MAP)).toBe('noun');
    });

    it('returns undefined for unmappable values', () => {
      expect(normalizePOS('biographical name', TEST_POS_MAP)).toBeUndefined();
      expect(normalizePOS('geographical name', TEST_POS_MAP)).toBeUndefined();
    });

    it('keeps abbreviation, a label in the vocabulary', () => {
      expect(normalizePOS('abbreviation', TEST_POS_MAP)).toBe('abbreviation');
    });

    it('ignores keys the map inherits from Object.prototype', () => {
      expect(normalizePOS('constructor', TEST_POS_MAP)).toBeUndefined();
      expect(normalizePOS('toString', TEST_POS_MAP)).toBeUndefined();
    });
  });

  describe('classifyPartOfSpeech', () => {
    it('classifies a base or mapped term as a part of speech', () => {
      expect(classifyPartOfSpeech('Noun', TEST_POS_MAP)).toStrictEqual({ partOfSpeech: 'noun' });
      expect(classifyPartOfSpeech('transitive verb', TEST_POS_MAP)).toStrictEqual({ partOfSpeech: 'verb' });
    });

    it('keeps an unmappable term, as supplied, as the label', () => {
      expect(classifyPartOfSpeech('Biographical Name', TEST_POS_MAP)).toStrictEqual({ label: 'Biographical Name' });
    });

    it.each([undefined, '', '  '])('classifies nothing for %j', (raw) => {
      expect(classifyPartOfSpeech(raw, TEST_POS_MAP)).toStrictEqual({});
    });
  });

  describe('buildDefinition', () => {
    it('keeps every supplied value, in the order stored records use', () => {
      const definition = buildDefinition({
        antonyms: ['unfortunate'],
        synonyms: ['luck'],
        examples: ['a happy find'],
        sourceUrl: 'https://example.com/serendipity',
        sourceDictionary: 'test',
        attributionText: 'from Test',
        references: [{ start: 5, end: 12, url: 'https://example.com/fortune' }],
        text: 'Good fortune',
        partOfSpeech: 'noun',
        id: 'serendipity',
      }, TEST_POS_MAP);

      expect(definition).toStrictEqual({
        id: 'serendipity',
        partOfSpeech: 'noun',
        text: 'Good fortune',
        references: [{ start: 5, end: 12, url: 'https://example.com/fortune' }],
        attributionText: 'from Test',
        sourceDictionary: 'test',
        sourceUrl: 'https://example.com/serendipity',
        examples: ['a happy find'],
        synonyms: ['luck'],
        antonyms: ['unfortunate'],
      });
      expect(Object.keys(definition)).toEqual([
        'id', 'partOfSpeech', 'text', 'references', 'attributionText', 'sourceDictionary', 'sourceUrl',
        'examples', 'synonyms', 'antonyms',
      ]);
    });

    it('omits missing, blank and empty optional values', () => {
      const definition = buildDefinition({
        text: 'Good fortune',
        id: '',
        attributionText: '  ',
        sourceDictionary: undefined,
        sourceUrl: '',
        references: [],
        examples: [],
        synonyms: [],
        antonyms: undefined,
      }, TEST_POS_MAP);

      expect(definition).toStrictEqual({ text: 'Good fortune' });
    });

    it('drops blank entries from a list, and the list when none are left', () => {
      const definition = buildDefinition({
        text: 'Good fortune',
        examples: [' ', 'a happy find', ''],
        synonyms: [''],
      }, TEST_POS_MAP);

      expect(definition).toStrictEqual({ text: 'Good fortune', examples: ['a happy find'] });
    });

    it('carries an unmappable part of speech as the label', () => {
      expect(buildDefinition({ text: 'An American seismologist', partOfSpeech: 'biographical name' }, TEST_POS_MAP))
        .toStrictEqual({ label: 'biographical name', text: 'An American seismologist' });
    });
  });

  describe('buildDictionaryResponse', () => {
    it.each(['serendipity', 'Japan', 'PB&J'])('reports %s exactly as given', (word) => {
      const response = buildDictionaryResponse(word, [], 'Test', 'from Test', 'https://example.com');

      expect(response.word).toBe(word);
    });

    it('omits a blank attribution and URL from the meta', () => {
      expect(buildDictionaryResponse('test', [], 'Test', '', undefined).meta).toStrictEqual({ source: 'Test' });
    });

    it('drops a definition whose text is blank, keeping the others in order', () => {
      const definitions: DictionaryDefinition[] = [{ text: '' }, { text: 'A trial', partOfSpeech: 'noun' }, { text: ' \n' }, { text: 'An exam' }];

      expect(buildDictionaryResponse('test', definitions, 'Test', undefined, undefined).definitions)
        .toStrictEqual([{ text: 'A trial', partOfSpeech: 'noun' }, { text: 'An exam' }]);
    });

    it('keeps only the headword fields that have a value', () => {
      const response = buildDictionaryResponse('test', [], 'Test', 'from Test', 'https://example.com', {
        pronunciation: 'test', audio: undefined, etymology: ' ',
      });

      expect(response.headword).toStrictEqual({ pronunciation: 'test' });
    });

    it('omits a headword with nothing in it', () => {
      const response = buildDictionaryResponse('test', [], 'Test', 'from Test', 'https://example.com', { pronunciation: '' });

      expect(response).not.toHaveProperty('headword');
    });
  });

  describe('isCanonicalResponse', () => {
    it('accepts a response carrying every field of the contract', () => {
      expect(isCanonicalResponse(CANONICAL, 'test')).toBe(true);
    });

    it('accepts the minimal response: the word, one definition with text, and a source', () => {
      expect(isCanonicalResponse({ word: 'test', definitions: [{ text: 'A trial' }], meta: { source: 'Test' } }, 'test')).toBe(true);
    });

    it('accepts a label in place of a part of speech', () => {
      expect(isCanonicalResponse(withDefinition({ partOfSpeech: undefined, label: 'biographical name' }), 'test')).toBe(true);
    });

    it('accepts text with a bracket that is not a tag', () => {
      expect(isCanonicalResponse(withDefinition({ text: 'Below range (<20 mg/dL) at critical levels' }), 'test')).toBe(true);
    });

    it('accepts encoded text without decoding it into markup', () => {
      expect(isCanonicalResponse(withDefinition({ text: '&lt;b&gt;critical&lt;/b&gt;' }), 'test')).toBe(true);
    });

    it('treats a field whose value is undefined as absent, as JSON does', () => {
      expect(isCanonicalResponse(withDefinition({ examples: undefined, wordnikUrl: undefined }), 'test')).toBe(true);
    });

    it.each([
      // Envelope
      ['a response that is not an object', []],
      ['a key outside the envelope', withResponse({ rawData: {} })],
      ['a word other than the one requested', withResponse({ word: 'Test' })],
      ['definitions that are not a list', withResponse({ definitions: CANONICAL_DEFINITION })],
      ['an empty definitions list', withResponse({ definitions: [] })],
      ['a missing meta', withResponse({ meta: undefined })],
      ['a key outside the meta', withMeta({ sourceUrl: 'https://example.com/test' })],
      ['a blank meta source', withMeta({ source: ' ' })],
      ['a blank meta attribution', withMeta({ attribution: '' })],
      ['a meta URL that is not absolute http(s)', withMeta({ url: '/test' })],
      ['an empty headword', withResponse({ headword: {} })],
      ['a key outside the headword', withHeadword({ phonetic: 'test' })],
      ['a blank headword pronunciation', withHeadword({ pronunciation: '' })],
      ['a blank headword etymology', withHeadword({ etymology: ' ' })],
      ['a headword audio URL that is not absolute http(s)', withHeadword({ audio: 'test.mp3' })],
      // Definitions
      ['a definition that is not an object', withResponse({ definitions: ['A trial'] })],
      ['a key outside the definition', withDefinition({ wordnikUrl: 'https://example.com/test' })],
      ['a definition without text', withoutDefinitionField('text')],
      ['blank text', withDefinition({ text: '  ' })],
      ['markup left in the text', withDefinition({ text: 'A procedure for <xref>critical</xref> evaluation', references: undefined })],
      ['an unknown tag left in the text', withDefinition({ text: 'A procedure for <i>critical</i> evaluation' })],
      ['an empty references list', withDefinition({ references: [] })],
      ['references that are not a list', withDefinition({ references: { start: 16, end: 24, url: 'https://example.com/critical' } })],
      ['a reference past the end of the text', withDefinition({ references: [{ start: 30, end: 40, url: 'https://example.com/critical' }] })],
      ['a reference over blank text', withDefinition({ references: [{ start: 15, end: 16, url: 'https://example.com/critical' }] })],
      ['overlapping references', withDefinition({ references: [
        { start: 16, end: 24, url: 'https://example.com/critical' },
        { start: 20, end: 35, url: 'https://example.com/evaluation' },
      ] })],
      ['a reference URL that is not http(s)', withDefinition({ references: [{ start: 16, end: 24, url: 'javascript:alert(1)' }] })],
      ['text given as fragments', withDefinition({ text: ['A procedure', 'for critical evaluation'] })],
      ['a part of speech outside the vocabulary', withDefinition({ partOfSpeech: 'transitive verb' })],
      ['a label beside a part of speech', withDefinition({ label: 'noun' })],
      ['a blank label', withDefinition({ partOfSpeech: undefined, label: '' })],
      ['a blank id', withDefinition({ id: '' })],
      ['a blank attribution', withDefinition({ attributionText: ' ' })],
      ['a blank source dictionary', withDefinition({ sourceDictionary: '' })],
      ['an empty examples list', withDefinition({ examples: [] })],
      ['an empty synonyms list', withDefinition({ synonyms: [] })],
      ['an empty antonyms list', withDefinition({ antonyms: [] })],
      ['a blank entry in a list', withDefinition({ synonyms: ['trial', ''] })],
      ['a list entry that is not a string', withDefinition({ examples: [1] })],
      ['a relative source URL', withDefinition({ sourceUrl: 'www.example.com/test' })],
      ['a source URL that is not http(s)', withDefinition({ sourceUrl: 'javascript:alert(1)' })],
      ['a blank source URL', withDefinition({ sourceUrl: '' })],
      ['one bad definition among good ones', withResponse({ definitions: [CANONICAL_DEFINITION, { text: '' }] })],
    ])('rejects %s', (_rule, response) => {
      expect(isCanonicalResponse(response, 'test')).toBe(false);
    });
  });

  describe('throwOnHttpError', () => {
    it('does nothing for ok responses', () => {
      const response = httpResponse(200);
      expect(() => throwOnHttpError(response, 'test')).not.toThrow();
    });

    it('throws rate limit error for 429', () => {
      const response = httpResponse(429);
      expect(() => throwOnHttpError(response, 'test')).toThrow(RateLimitError);
      expect(() => throwOnHttpError(response, 'test')).toThrow('Rate limit exceeded');
    });

    it('throws word not found for 404', () => {
      const response = httpResponse(404);
      expect(() => throwOnHttpError(response, 'serendipity')).toThrow(WordNotFoundError);
      expect(() => throwOnHttpError(response, 'serendipity')).toThrow(
        'Word "serendipity" not found in dictionary',
      );
    });

    it('throws generic error with statusText for other failures', () => {
      const response = httpResponse(500, 'Internal Server Error');
      const error = (() => {
        try {
          throwOnHttpError(response, 'test');
        } catch (thrown) {
          return thrown;
        }
      })();
      expect(getError(error).message).toBe('Failed to fetch word data: Internal Server Error');
      expect(error).not.toBeInstanceOf(WordNotFoundError);
      expect(error).not.toBeInstanceOf(RateLimitError);
    });
  });

  describe('parseJsonResponse', () => {
    it('names the adapter when the body cannot be read', async () => {
      const cause = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
      const body = new ReadableStream({
        start(controller) {
          controller.error(cause);
        },
      });
      const error = getError(await parseJsonResponse(new Response(body), 'TestAPI').catch(e => e));
      expect(error.message).toBe(
        'Failed to read TestAPI response body: The operation was aborted due to timeout',
      );
      expect(error.cause).toBe(cause);
    });

    it('parses valid JSON response', async () => {
      const response = new Response(JSON.stringify({ word: 'test' }));
      const result = await parseJsonResponse(response, 'TestAPI');
      expect(result).toEqual({ word: 'test' });
    });

    it('throws with response text on parse failure', async () => {
      const response = new Response('<html>Invalid API Key</html>');
      const error = getError(await parseJsonResponse(response, 'TestAPI').catch(e => e));
      expect(error.message).toBe(
        'Invalid API response (not JSON) from TestAPI. Response: <html>Invalid API Key</html>',
      );
      expect(error.cause).toBeInstanceOf(SyntaxError);
    });

    it('truncates long error responses', async () => {
      const response = new Response('x'.repeat(500));
      const error = getError(await parseJsonResponse(response, 'TestAPI').catch(e => e));
      expect(error.message).toContain('Invalid API response (not JSON) from TestAPI');
      expect(error.message.length).toBeLessThan(300);
    });
  });

  describe('throwWordNotFound', () => {
    it('throws with consistent message format', () => {
      expect(() => throwWordNotFound('serendipity')).toThrow(WordNotFoundError);
      expect(() => throwWordNotFound('serendipity')).toThrow(
        'Word "serendipity" not found in dictionary. Please check the spelling.',
      );
    });
  });

  describe('isWordNotFound', () => {
    const notFound = new WordNotFoundError('Word "zz" not found. Did you mean: za, ze');

    it('is true when the only adapter said not found', () => {
      expect(isWordNotFound(notFound)).toBe(true);
    });

    it('is true when every adapter in the chain said not found', () => {
      expect(isWordNotFound(new AggregateError([notFound, new WordNotFoundError('gone')]))).toBe(true);
    });

    it('is false when any adapter failed for another reason', () => {
      expect(isWordNotFound(new AggregateError([new RateLimitError('slow down'), notFound]))).toBe(false);
      expect(isWordNotFound(new AggregateError([notFound, new Error('network request failed')]))).toBe(false);
    });

    it('goes by type, not by message', () => {
      expect(isWordNotFound(new Error('Word "zz" not found in dictionary. Please check the spelling.'))).toBe(false);
    });
  });

  describe('isRateLimited', () => {
    it('is true when any adapter in the chain was rate limited', () => {
      expect(isRateLimited(new RateLimitError('slow down'))).toBe(true);
      expect(isRateLimited(new AggregateError([new RateLimitError('slow down'), new WordNotFoundError('gone')]))).toBe(true);
    });

    it('goes by type, not by message', () => {
      expect(isRateLimited(new WordNotFoundError('Word "zz429" not found in dictionary.'))).toBe(false);
      expect(isRateLimited(new Error('Rate limit exceeded'))).toBe(false);
    });
  });

  describe('throwUnexpectedShape', () => {
    it('names the adapter and the word', () => {
      expect(() => throwUnexpectedShape('Wordnik', 'serendipity')).toThrow(
        'Wordnik returned an unexpected response shape for "serendipity"',
      );
    });
  });
});
