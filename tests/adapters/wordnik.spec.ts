import fs from 'node:fs';
import path from 'node:path';
import {
 beforeEach,describe, expect, it, vi,
} from 'vitest';
import type { WordnikDefinition } from '#types/wordnik';

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', fetchMock);

const FIXTURES_DIR = path.join(import.meta.dirname, 'fixtures', 'wordnik');
const loadFixture = (name: string): unknown => JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, `${name}.json`), 'utf-8'));

const STATUS_TEXT: Record<number, string> = { 404: 'Not Found', 429: 'Too Many Requests' };
const mockResponse = (status: number, data: unknown = []): Response => new Response(
  JSON.stringify(data),
  { status, statusText: STATUS_TEXT[status] ?? 'OK' },
);

const VALID_DEFINITIONS: WordnikDefinition[] = [
  { id: '1', text: 'A test definition', partOfSpeech: 'noun', attributionText: 'test' },
];

const first = <T>(items: T[]): T => {
  const [item] = items;
  if (item === undefined) {
    throw new Error('expected a non-empty list');
  }
  return item;
};

describe('wordnik adapter', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('WORDNIK_WEBSITE_URL', 'https://www.wordnik.com');
    vi.stubEnv('WORDNIK_API_URL', 'https://api.wordnik.com/v4');
  });

  describe('CONFIG', () => {
    it('exports configuration constants', async () => {
      const { CONFIG } = await import('#adapters/wordnik');
      expect(CONFIG).toHaveProperty('BASE_URL');
      expect(CONFIG).toHaveProperty('DEFAULT_LIMIT');
      expect(CONFIG.DEFAULT_LIMIT).toBe(10);
    });
  });

  describe('POS normalization', () => {
    beforeEach(() => {
      vi.stubEnv('WORDNIK_API_KEY', 'test-key');
    });

    // Every value of the partOfSpeech filter in Wordnik's API spec
    // (https://developer.wordnik.com/api-docs/swagger.json; "posessive" is its
    // spelling), then the spaced labels its source dictionaries put in
    // responses: AHD's "transitive verb", GCIDE's "noun plural", Wiktionary's
    // "proper noun". Verb forms and name types stay labels.
    it.each([
      ['noun', { partOfSpeech: 'noun' }],
      ['adjective', { partOfSpeech: 'adjective' }],
      ['verb', { partOfSpeech: 'verb' }],
      ['adverb', { partOfSpeech: 'adverb' }],
      ['interjection', { partOfSpeech: 'interjection' }],
      ['pronoun', { partOfSpeech: 'pronoun' }],
      ['preposition', { partOfSpeech: 'preposition' }],
      ['abbreviation', { partOfSpeech: 'abbreviation' }],
      ['affix', { label: 'affix' }],
      ['article', { partOfSpeech: 'article' }],
      ['auxiliary-verb', { partOfSpeech: 'verb' }],
      ['conjunction', { partOfSpeech: 'conjunction' }],
      ['definite-article', { partOfSpeech: 'article' }],
      ['family-name', { label: 'family-name' }],
      ['given-name', { label: 'given-name' }],
      ['idiom', { label: 'idiom' }],
      ['imperative', { label: 'imperative' }],
      ['noun-plural', { partOfSpeech: 'noun' }],
      ['noun-posessive', { partOfSpeech: 'noun' }],
      ['past-participle', { label: 'past-participle' }],
      ['phrasal-prefix', { label: 'phrasal-prefix' }],
      ['proper-noun', { partOfSpeech: 'noun' }],
      ['proper-noun-plural', { partOfSpeech: 'noun' }],
      ['proper-noun-posessive', { partOfSpeech: 'noun' }],
      ['suffix', { label: 'suffix' }],
      ['verb-intransitive', { partOfSpeech: 'verb' }],
      ['verb-transitive', { partOfSpeech: 'verb' }],
      ['intransitive verb', { partOfSpeech: 'verb' }],
      ['transitive verb', { partOfSpeech: 'verb' }],
      ['phrasal verb', { partOfSpeech: 'verb' }],
      ['proper noun', { partOfSpeech: 'noun' }],
      ['noun plural', { partOfSpeech: 'noun' }],
      ['auxiliary verb', { partOfSpeech: 'verb' }],
      ['definite article.', { partOfSpeech: 'article' }],
      ['initialism', { partOfSpeech: 'abbreviation' }],
    ])('translates %s', async (raw: string, classification: { partOfSpeech?: string; label?: string }) => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      fetchMock.mockResolvedValueOnce(mockResponse(200, [{ text: 'A sense', partOfSpeech: raw }]));

      const definition = first((await wordnikAdapter.fetchWordData('test')).definitions);
      expect({ partOfSpeech: definition.partOfSpeech, label: definition.label }).toEqual(classification);
    });

    it('keeps an unmappable POS, as Wordnik gave it, as the label', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      const defs = [{ id: '1', text: 'An affix', partOfSpeech: 'affix', attributionText: 'test' }];
      fetchMock.mockResolvedValueOnce(mockResponse(200, defs));

      const result = await wordnikAdapter.fetchWordData('un');
      expect(result.definitions).toStrictEqual([{ id: '1', label: 'affix', text: 'An affix', attributionText: 'test' }]);
    });
  });

  describe('translation to the canonical definition', () => {
    beforeEach(() => {
      vi.stubEnv('WORDNIK_API_KEY', 'test-key');
    });

    it('translates the constructed break response', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      fetchMock.mockResolvedValueOnce(mockResponse(200, loadFixture('break')));
      const ahd = 'from The American Heritage® Dictionary of the English Language, 5th Edition.';
      const sourceUrl = 'https://www.wordnik.com/words/break';

      const result = await wordnikAdapter.fetchWordData('break');
      expect(result).toStrictEqual({
        word: 'break',
        definitions: [
          {
            partOfSpeech: 'verb',
            text: 'To cause to separate into pieces suddenly or violently.',
            attributionText: ahd,
            sourceDictionary: 'ahd-5',
            sourceUrl,
            examples: ['The plate broke when it hit the floor.'],
            synonyms: ['shatter', 'smash'],
            antonyms: ['mend'],
          },
          {
            partOfSpeech: 'noun',
            text: 'An interruption in continuity. A pause from work or activity.',
            attributionText: ahd,
            sourceDictionary: 'ahd-5',
            sourceUrl,
            synonyms: ['pause'],
          },
          {
            label: 'idiom',
            text: 'break even: To finish with neither a gain nor a loss.',
            attributionText: ahd,
            sourceDictionary: 'ahd-5',
            sourceUrl,
          },
          {
            partOfSpeech: 'noun',
            text: 'A short rest period.',
            references: [{ start: 8, end: 12, url: 'https://www.wordnik.com/words/rest' }],
            attributionText: 'from Wiktionary, Creative Commons Attribution/Share-Alike License.',
            sourceDictionary: 'wiktionary',
            sourceUrl,
          },
        ],
        meta: { source: 'Wordnik', attribution: ahd, url: sourceUrl },
        headword: { pronunciation: 'brāk' },
      });
    });

    it('reads cross-references out of the text as ranges of it', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      fetchMock.mockResolvedValueOnce(mockResponse(200, loadFixture('amblypygi')));

      const definition = first((await wordnikAdapter.fetchWordData('Amblypygi')).definitions);
      expect(definition.text).toBe('A taxonomic order within the class Arachnida — the tailless whip scorpions/whip spiders.');
      expect(definition.references).toStrictEqual([
        { start: 12, end: 17, url: 'https://www.wordnik.com/words/order' },
        { start: 29, end: 34, url: 'https://www.wordnik.com/words/class' },
        { start: 35, end: 44, url: 'https://www.wordnik.com/words/arachnida' },
      ]);
    });

    it('omits references from text that has none', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      fetchMock.mockResolvedValueOnce(mockResponse(200, VALID_DEFINITIONS));

      const definition = first((await wordnikAdapter.fetchWordData('test')).definitions);
      expect(definition).not.toHaveProperty('references');
    });

    it('joins text fragments into one string', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      const defs = [{ text: ['A taxonomic order', 'of arachnids.'], partOfSpeech: 'noun' }];
      fetchMock.mockResolvedValueOnce(mockResponse(200, defs));

      const result = await wordnikAdapter.fetchWordData('amblypygi');
      expect(first(result.definitions).text).toBe('A taxonomic order of arachnids.');
    });

    it('skips a definition that has no text', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      const defs = [{ partOfSpeech: 'noun' }, { text: '  ', partOfSpeech: 'noun' }, { text: [], partOfSpeech: 'noun' }, { text: 'Kept', partOfSpeech: 'noun' }];
      fetchMock.mockResolvedValueOnce(mockResponse(200, defs));

      const result = await wordnikAdapter.fetchWordData('test');
      expect(result.definitions).toStrictEqual([{ partOfSpeech: 'noun', text: 'Kept' }]);
    });

    it('omits the empty lists and URLs Wordnik sends', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      const defs = [{
        text: 'A test', partOfSpeech: 'noun', attributionText: '', wordnikUrl: '', attributionUrl: '',
        exampleUses: [], relatedWords: [], textProns: [], citations: [], labels: [], notes: [],
      }];
      fetchMock.mockResolvedValueOnce(mockResponse(200, defs));

      const result = await wordnikAdapter.fetchWordData('test');
      expect(result).toStrictEqual({
        word: 'test',
        definitions: [{ partOfSpeech: 'noun', text: 'A test' }],
        meta: { source: 'Wordnik' },
      });
    });
  });

  describe('fetchWordData', () => {
    beforeEach(() => {
      vi.stubEnv('WORDNIK_API_KEY', 'test-key');
    });

    it('returns definitions for a valid word', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      fetchMock.mockResolvedValueOnce(mockResponse(200, VALID_DEFINITIONS));

      const result = await wordnikAdapter.fetchWordData('serendipity');
      expect(result.word).toBe('serendipity');
      expect(result.definitions).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('reads pronunciation and synonyms from object-shaped textProns and relatedWords', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      const defs = [{
        id: '1',
        text: 'Good fortune',
        textProns: [{ raw: 'ser-uhn-DIP-i-tee', rawType: 'ahd-5', seq: 0 }],
        relatedWords: [
          { relationshipType: 'synonym', words: ['luck', 'fortune'] },
          { relationshipType: 'variant' },
          { relationshipType: 'synonym', words: ['chance'] },
        ],
      }, { id: '2', text: 'No related words' }];
      fetchMock.mockResolvedValueOnce(mockResponse(200, defs));

      const result = await wordnikAdapter.fetchWordData('serendipity');
      expect(result.headword).toEqual({ pronunciation: 'ser-uhn-DIP-i-tee' });
      expect(result.definitions).toHaveLength(2);
      expect(first(result.definitions).synonyms).toEqual(['luck', 'fortune', 'chance']);
      expect(result.definitions[1]?.synonyms).toBeUndefined();
    });

    it('makes exactly one request per lookup', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      fetchMock.mockResolvedValueOnce(mockResponse(200, VALID_DEFINITIONS));

      await wordnikAdapter.fetchWordData('Serendipity');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('throws when word returns empty results', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      fetchMock.mockResolvedValueOnce(mockResponse(200, []));

      await expect(wordnikAdapter.fetchWordData('serendipity')).rejects.toThrow('not found in dictionary');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('throws when word returns 404', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      fetchMock.mockResolvedValueOnce(mockResponse(404));

      await expect(wordnikAdapter.fetchWordData('nonexistent')).rejects.toThrow('not found in dictionary');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('throws on rate limit (429)', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      fetchMock.mockResolvedValueOnce(mockResponse(429));

      await expect(wordnikAdapter.fetchWordData('test')).rejects.toThrow('Rate limit exceeded');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('malformed responses', () => {
    beforeEach(() => {
      vi.stubEnv('WORDNIK_API_KEY', 'test-key');
    });

    it('throws a Wordnik shape error for a non-array body', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      fetchMock.mockResolvedValueOnce(mockResponse(200, { message: 'unexpected' }));

      await expect(wordnikAdapter.fetchWordData('test')).rejects.toThrow(
        'Wordnik returned an unexpected response shape for "test"',
      );
    });

    it('throws a Wordnik shape error when a definition field has the wrong type', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      fetchMock.mockResolvedValueOnce(mockResponse(200, [...VALID_DEFINITIONS, { text: 'ok', exampleUses: [{ text: 5 }] }]));

      await expect(wordnikAdapter.fetchWordData('test')).rejects.toThrow('Wordnik returned an unexpected response shape');
    });

    it('skips examples that have no text instead of refusing the response', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      const definition = { ...first(VALID_DEFINITIONS), exampleUses: [{ position: 1 }, { text: 'A usable example.' }] };
      fetchMock.mockResolvedValueOnce(mockResponse(200, [definition]));

      const result = await wordnikAdapter.fetchWordData('test');
      expect(first(result.definitions).examples).toEqual(['A usable example.']);
    });
  });

  describe('isWordnikDefinitions', () => {
    it('accepts definitions with string or array text and empty objects', async () => {
      const { isWordnikDefinitions } = await import('#adapters/wordnik');
      expect(isWordnikDefinitions(VALID_DEFINITIONS)).toBe(true);
      expect(isWordnikDefinitions([{ text: ['a', 'b'], exampleUses: [{ text: 'x' }], relatedWords: [], textProns: [] }])).toBe(true);
      expect(isWordnikDefinitions([{ relatedWords: [{ relationshipType: 'synonym', words: ['luck'] }, {}], textProns: [{ raw: 'x', rawType: 'ahd-5', seq: 0 }, {}] }])).toBe(true);
      expect(isWordnikDefinitions([{}])).toBe(true);
      expect(isWordnikDefinitions([])).toBe(true);
    });

    it('rejects non-arrays and malformed definitions', async () => {
      const { isWordnikDefinitions } = await import('#adapters/wordnik');
      expect(isWordnikDefinitions({ message: 'error' })).toBe(false);
      expect(isWordnikDefinitions(null)).toBe(false);
      expect(isWordnikDefinitions([null])).toBe(false);
      expect(isWordnikDefinitions([{ id: 1 }])).toBe(false);
      expect(isWordnikDefinitions([{ partOfSpeech: 1 }])).toBe(false);
      expect(isWordnikDefinitions([{ text: 1 }])).toBe(false);
      expect(isWordnikDefinitions([{ text: ['a', 1] }])).toBe(false);
      expect(isWordnikDefinitions([{ attributionText: 1 }])).toBe(false);
      expect(isWordnikDefinitions([{ sourceDictionary: 1 }])).toBe(false);
      expect(isWordnikDefinitions([{ wordnikUrl: 1 }])).toBe(false);
      expect(isWordnikDefinitions([{ attributionUrl: 1 }])).toBe(false);
      expect(isWordnikDefinitions([{ exampleUses: 'x' }])).toBe(false);
      expect(isWordnikDefinitions([{ exampleUses: ['x'] }])).toBe(false);
      expect(isWordnikDefinitions([{ relatedWords: ['luck'] }])).toBe(false);
      expect(isWordnikDefinitions([{ relatedWords: [{ words: 'luck' }] }])).toBe(false);
      expect(isWordnikDefinitions([{ relatedWords: [{ words: [1] }] }])).toBe(false);
      expect(isWordnikDefinitions([{ relatedWords: [{ relationshipType: 1, words: ['luck'] }] }])).toBe(false);
      expect(isWordnikDefinitions([{ textProns: ['pron'] }])).toBe(false);
      expect(isWordnikDefinitions([{ textProns: [{ raw: 1 }] }])).toBe(false);
    });
  });
});
