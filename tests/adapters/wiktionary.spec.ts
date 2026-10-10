import fs from 'node:fs';
import path from 'node:path';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', fetchMock);

const STATUS_TEXT: Record<number, string> = { 404: 'Not Found', 429: 'Too Many Requests' };
const mockResponse = (status: number, data: unknown = []): Response => new Response(
  JSON.stringify(data),
  { status, statusText: STATUS_TEXT[status] ?? 'OK' },
);

const FIXTURES_DIR = path.join(import.meta.dirname, 'fixtures', 'wiktionary');
const loadFixture = (name: string): unknown => JSON.parse(
  fs.readFileSync(path.join(FIXTURES_DIR, `${name}.json`), 'utf-8'),
);

const fixtureEntries = (name: string): unknown[] => {
  const fixture = loadFixture(name);
  if (!Array.isArray(fixture)) {
    throw new Error('fixture is not an array');
  }
  return fixture;
};

const first = <T>(items: T[]): T => {
  const [item] = items;
  if (item === undefined) {
    throw new Error('expected a non-empty list');
  }
  return item;
};

describe('wiktionary adapter', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('fetchWordData malformed responses', () => {
    it('throws a Wiktionary shape error when a meaning has no definitions', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      fetchMock.mockResolvedValueOnce(mockResponse(200, [{ word: 'test', meanings: [{ partOfSpeech: 'noun' }] }]));

      await expect(wiktionaryAdapter.fetchWordData('test')).rejects.toThrow(
        'Wiktionary returned an unexpected response shape for "test"',
      );
    });

    it('throws a Wiktionary shape error, not "not found", when the body is not an array', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const { WordNotFoundError } = await import('#utils/adapter-utils');
      fetchMock.mockResolvedValueOnce(mockResponse(200, { entries: [] }));

      const error = await wiktionaryAdapter.fetchWordData('test').catch(e => e);
      expect(error).not.toBeInstanceOf(WordNotFoundError);
      expect(error.message).toBe('Wiktionary returned an unexpected response shape for "test"');
    });

    it.each([
      ['the first entry has no meanings', [{ word: 'test', meanings: [] }]],
      ['the body is an empty array', []],
    ])('reports not found when %s', async (_, body) => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      fetchMock.mockResolvedValueOnce(mockResponse(200, body));

      await expect(wiktionaryAdapter.fetchWordData('test')).rejects.toThrow('not found in dictionary');
    });
  });

  describe('fetchWordData', () => {
    it('returns definitions for a word with one meaning', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const fixture = loadFixture('pneumonoultramicroscopicsilicovolcanoconiosis');
      fetchMock.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await wiktionaryAdapter.fetchWordData('pneumonoultramicroscopicsilicovolcanoconiosis');
      expect(result.word).toBe('pneumonoultramicroscopicsilicovolcanoconiosis');
      expect(result.definitions).toHaveLength(1);
      expect(first(result.definitions).partOfSpeech).toBe('noun');
      expect(first(result.definitions).text).toContain('disease of the lungs');
      expect(result.meta.source).toBe('Wiktionary');
    });

    it('returns multiple definitions from multiple meanings', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const fixture = loadFixture('serendipity');
      fetchMock.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await wiktionaryAdapter.fetchWordData('serendipity');
      expect(result.word).toBe('serendipity');
      expect(result.definitions).toHaveLength(2);
      expect(result.definitions.every(d => d.partOfSpeech === 'noun')).toBe(true);
    });

    it('drops a blank definition and keeps the rest of the entry', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const { isCanonicalResponse } = await import('#utils/adapter-utils');
      const entry = { word: 'test', meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: '' }, { definition: 'A thing' }, { definition: ' ' }] }] };
      fetchMock.mockResolvedValueOnce(mockResponse(200, [entry]));

      const result = await wiktionaryAdapter.fetchWordData('test');
      expect(result.definitions.map(definition => definition.text)).toEqual(['A thing']);
      expect(isCanonicalResponse(result, 'test')).toBe(true);
    });

    it('reports the word exactly as the caller gave it', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const fixture = loadFixture('serendipity');
      fetchMock.mockResolvedValueOnce(mockResponse(200, fixture));

      // Case is the caller's decision (--preserve-case); the adapter passes it through.
      const result = await wiktionaryAdapter.fetchWordData('Serendipity');
      expect(result.word).toBe('Serendipity');
    });

    it('throws on 404', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      fetchMock.mockResolvedValueOnce(mockResponse(404));

      await expect(wiktionaryAdapter.fetchWordData('xyzzy')).rejects.toThrow('not found');
    });

    it('throws on server error', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      fetchMock.mockResolvedValueOnce(mockResponse(500));

      await expect(wiktionaryAdapter.fetchWordData('test')).rejects.toThrow('Failed to fetch');
    });

    it('includes attribution on each definition', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const fixture = loadFixture('serendipity');
      fetchMock.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await wiktionaryAdapter.fetchWordData('serendipity');
      for (const def of result.definitions) {
        expect(def.attributionText).toBe('from Wiktionary');
        expect(def.sourceDictionary).toBe('wiktionary');
        expect(def.sourceUrl).toContain('wiktionary.org');
      }
    });

    it('includes synonyms and antonyms when present', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const fixture = loadFixture('serendipity');
      fetchMock.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await wiktionaryAdapter.fetchWordData('serendipity');
      const defWithSynonyms = result.definitions.find(d => d.synonyms?.length);
      if (!defWithSynonyms) {
        throw new Error('expected a definition with synonyms');
      }
      expect(defWithSynonyms.synonyms).toContain('chance');
    });
  });

  describe('POS normalization', () => {
    it('passes through base POS unchanged', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const fixture = loadFixture('serendipity');
      fetchMock.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await wiktionaryAdapter.fetchWordData('serendipity');
      expect(first(result.definitions).partOfSpeech).toBe('noun');
    });

    it('normalizes exclamation to interjection', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const entry = [{
        word: 'wow',
        phonetics: [],
        meanings: [{ partOfSpeech: 'exclamation', definitions: [{ definition: 'An expression of surprise' }] }],
        sourceUrls: ['https://en.wiktionary.org/wiki/wow'],
      }];
      fetchMock.mockResolvedValueOnce(mockResponse(200, entry));

      const result = await wiktionaryAdapter.fetchWordData('wow');
      expect(first(result.definitions).partOfSpeech).toBe('interjection');
    });

    it('keeps an unmappable part of speech as the label', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const entry = [{
        word: 'break a leg',
        meanings: [{ partOfSpeech: 'phrase', definitions: [{ definition: 'Good luck' }] }],
        sourceUrls: ['https://en.wiktionary.org/wiki/break_a_leg'],
      }];
      fetchMock.mockResolvedValueOnce(mockResponse(200, entry));

      const result = await wiktionaryAdapter.fetchWordData('break a leg');
      expect(first(result.definitions)).not.toHaveProperty('partOfSpeech');
      expect(first(result.definitions).label).toBe('phrase');
    });
  });

  describe('omitted values', () => {
    it('omits the source URL, and empty synonyms and antonyms, when the entry has none', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const entry = [{
        word: 'wow',
        meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'A success', synonyms: [], antonyms: [] }] }],
      }];
      fetchMock.mockResolvedValueOnce(mockResponse(200, entry));

      const result = await wiktionaryAdapter.fetchWordData('wow');
      expect(result).toStrictEqual({
        word: 'wow',
        definitions: [{ partOfSpeech: 'noun', text: 'A success', attributionText: 'from Wiktionary', sourceDictionary: 'wiktionary' }],
        meta: { source: 'Wiktionary', attribution: 'from Wiktionary' },
      });
    });
  });

  describe('isFreeDictionaryEntry', () => {
    it.each(['serendipity', 'pneumonoultramicroscopicsilicovolcanoconiosis'])('accepts every entry of the recorded %s response', async (name) => {
      const { isFreeDictionaryEntry } = await import('#adapters/wiktionary');
      expect(fixtureEntries(name).every(isFreeDictionaryEntry)).toBe(true);
    });

    it('rejects malformed entries', async () => {
      const { isFreeDictionaryEntry } = await import('#adapters/wiktionary');
      const definitions = [{ definition: 'a test' }];
      expect(isFreeDictionaryEntry(null)).toBe(false);
      expect(isFreeDictionaryEntry({ meanings: [] })).toBe(false);
      expect(isFreeDictionaryEntry({ meanings: [null] })).toBe(false);
      expect(isFreeDictionaryEntry({ meanings: [{ definitions }] })).toBe(false);
      expect(isFreeDictionaryEntry({ meanings: [{ partOfSpeech: 'noun' }] })).toBe(false);
      expect(isFreeDictionaryEntry({ meanings: [{ partOfSpeech: 'noun', definitions: [{}] }] })).toBe(false);
      expect(isFreeDictionaryEntry({ meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'x', example: 1 }] }] })).toBe(false);
      expect(isFreeDictionaryEntry({ meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'x', synonyms: 'y' }] }] })).toBe(false);
      expect(isFreeDictionaryEntry({ meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'x', antonyms: [1] }] }] })).toBe(false);
      expect(isFreeDictionaryEntry({ meanings: [{ partOfSpeech: 'noun', definitions }], sourceUrls: 'url' })).toBe(false);
    });

    it('rejects an entry whose later meaning is malformed', async () => {
      const { isFreeDictionaryEntry } = await import('#adapters/wiktionary');
      const entry = fixtureEntries('serendipity').find(isFreeDictionaryEntry);
      if (!entry) {
        throw new Error('expected a valid fixture entry');
      }
      expect(isFreeDictionaryEntry({ ...entry, meanings: [...entry.meanings, { partOfSpeech: 'noun' }] })).toBe(false);
    });
  });
});
