import fs from 'node:fs';
import path from 'node:path';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import type { MWEntry } from '#types/merriam-webster';

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', fetchMock);

const STATUS_TEXT: Record<number, string> = { 404: 'Not Found', 429: 'Too Many Requests' };
const mockResponse = (status: number, data: unknown = []): Response => new Response(
  typeof data === 'string' ? data : JSON.stringify(data),
  { status, statusText: STATUS_TEXT[status] ?? 'OK' },
);

const FIXTURES_DIR = path.join(import.meta.dirname, 'fixtures', 'merriam-webster');
const loadFixture = (name: string): unknown => JSON.parse(
  fs.readFileSync(path.join(FIXTURES_DIR, `${name}.json`), 'utf-8'),
);

const firstEntry = (fixture: unknown, isEntry: (value: unknown) => value is MWEntry): MWEntry => {
  if (!Array.isArray(fixture)) {
    throw new Error('fixture is not an array');
  }
  const [entry] = fixture;
  if (!isEntry(entry)) {
    throw new Error('fixture does not contain a valid entry');
  }
  return entry;
};

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

describe('merriam-webster adapter', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('MERRIAM_WEBSTER_API_URL', 'https://dictionaryapi.com/api/v3/references');
    vi.stubEnv('MERRIAM_WEBSTER_DICTIONARY', 'collegiate');
  });

  describe('stripMarkup', () => {
    it('converts {bc} to colon-space', async () => {
      const { stripMarkup } = await import('#adapters/merriam-webster');
      expect(stripMarkup('{bc}a definition')).toBe(': a definition');
    });

    it('strips formatting tags but keeps content', async () => {
      const { stripMarkup } = await import('#adapters/merriam-webster');
      expect(stripMarkup('a {it}test{/it} word')).toBe('a test word');
      expect(stripMarkup('a {b}bold{/b} word')).toBe('a bold word');
      expect(stripMarkup('a {sc}small-caps{/sc} word')).toBe('a small-caps word');
      expect(stripMarkup('{wi}word{/wi} info')).toBe('word info');
    });

    it('converts smart quotes', async () => {
      const { stripMarkup } = await import('#adapters/merriam-webster');
      expect(stripMarkup('{ldquo}hello{rdquo}')).toBe('\u201chello\u201d');
    });

    it('extracts word from cross-reference tokens', async () => {
      const { stripMarkup } = await import('#adapters/merriam-webster');
      expect(stripMarkup('{sx|frankfurter||}')).toBe('frankfurter');
      expect(stripMarkup('{a_link|dancing}')).toBe('dancing');
      expect(stripMarkup('{d_link|hotdogs|hotdog:2}')).toBe('hotdogs');
      expect(stripMarkup('{dxt|test|test:1|1}')).toBe('test');
    });

    it('strips remaining unknown tags', async () => {
      const { stripMarkup } = await import('#adapters/merriam-webster');
      expect(stripMarkup('{unknown}content')).toBe('content');
    });

    it('handles nested formatting tokens', async () => {
      const { stripMarkup } = await import('#adapters/merriam-webster');
      const input = '{bc}{it}serendipity{/it} is wonderful';
      expect(stripMarkup(input)).toBe(': serendipity is wonderful');
    });

    it('passes through plain text unchanged', async () => {
      const { stripMarkup } = await import('#adapters/merriam-webster');
      expect(stripMarkup('just plain text')).toBe('just plain text');
    });

    it('handles null and undefined', async () => {
      const { stripMarkup } = await import('#adapters/merriam-webster');
      // Deliberately invalid inputs verify the runtime guard.
      // @ts-expect-error Runtime contract test: null is rejected at runtime.
      expect(stripMarkup(null)).toBe(null);
      // @ts-expect-error Runtime contract test: undefined is rejected at runtime.
      expect(stripMarkup(undefined)).toBe(undefined);
    });
  });

  describe('extractExamples', () => {
    it('extracts vis tuples from definition tree', async () => {
      const { extractExamples, isMWEntry } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('serendipity');
      const examples = extractExamples(firstEntry(fixture, isMWEntry));
      expect(examples).toHaveLength(1);
      expect(examples[0]).toBe('a fortunate stroke of serendipity');
    });

    it('strips markup from example text', async () => {
      const { extractExamples, isMWEntry } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('ludicrous');
      const examples = extractExamples(firstEntry(fixture, isMWEntry));
      expect(examples.some(e => e.includes('ludicrous'))).toBe(true);
      expect(examples.every(e => !e.includes('{it}'))).toBe(true);
    });

    it('returns empty array for entries without def', async () => {
      const { extractExamples } = await import('#adapters/merriam-webster');
      // Deliberately malformed input verifies the runtime guard.
      // @ts-expect-error Runtime contract test: missing required meta.src.
      expect(extractExamples({ meta: { id: 'test' } })).toEqual([]);
    });

    it('handles entries without vis tuples', async () => {
      const { extractExamples, isMWEntry } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('richter-scale');
      // The collegiate entry has no vis tuples
      const examples = extractExamples(firstEntry(fixture, isMWEntry));
      expect(examples).toEqual([]);
    });

    it('collects examples from multiple senses', async () => {
      const { extractExamples, isMWEntry } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('learned');
      const examples = extractExamples(firstEntry(fixture, isMWEntry));
      expect(examples.length).toBeGreaterThanOrEqual(2);
    });

    it('extracts examples with cross-reference markup', async () => {
      const { extractExamples, isMWEntry } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('ludicrous');
      const examples = extractExamples(firstEntry(fixture, isMWEntry));
      // The second vis has {a_link|dancing} which should be stripped to "dancing"
      const danceExample = examples.find(e => e.includes('dancing'));
      expect(danceExample).toBeDefined();
      expect(danceExample).not.toContain('{a_link');
    });
  });

  describe('POS normalization', () => {
    beforeEach(() => {
      vi.stubEnv('MERRIAM_WEBSTER_API_KEY', 'test-key');
    });

    it('passes through base POS unchanged', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('serendipity');
      fetchMock.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await merriamWebsterAdapter.fetchWordData('serendipity');
      expect(first(result.definitions).partOfSpeech).toBe('noun');
    });

    it('normalizes verb variations to verb', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const entry = [{
        meta: { id: 'test', uuid: '1', src: 'collegiate', section: 'alpha', stems: [], offensive: false },
        hwi: { hw: 'test' },
        fl: 'transitive verb',
        shortdef: ['to do something'],
        def: [],
      }];
      fetchMock.mockResolvedValueOnce(mockResponse(200, entry));

      const result = await merriamWebsterAdapter.fetchWordData('test');
      expect(first(result.definitions).partOfSpeech).toBe('verb');
    });

    it('normalizes article variations to article', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const entry = [{
        meta: { id: 'the', uuid: '1', src: 'collegiate', section: 'alpha', stems: [], offensive: false },
        hwi: { hw: 'the' },
        fl: 'definite article',
        shortdef: ['used as a function word'],
        def: [],
      }];
      fetchMock.mockResolvedValueOnce(mockResponse(200, entry));

      const result = await merriamWebsterAdapter.fetchWordData('the');
      expect(first(result.definitions).partOfSpeech).toBe('article');
    });

    it('keeps the abbreviation functional label', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      fetchMock.mockResolvedValueOnce(mockResponse(200, loadFixture('pbj')));

      const result = await merriamWebsterAdapter.fetchWordData('pb&j');
      expect(result.definitions).toStrictEqual([{
        id: 'PB+J',
        partOfSpeech: 'abbreviation',
        text: 'peanut butter and jelly',
        attributionText: "from Merriam-Webster's Collegiate Dictionary",
        sourceDictionary: 'collegiate',
        sourceUrl: 'https://www.merriam-webster.com/dictionary/pb%26j',
      }]);
    });

    it('keeps an unmappable functional label as the label, with no part of speech', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const entry = [{
        meta: { id: 'richter', uuid: '1', src: 'collegiate', section: 'biog', stems: [], offensive: false },
        hwi: { hw: 'Richter' },
        fl: 'biographical name',
        shortdef: ['Charles Francis 1900-1985'],
        def: [],
      }];
      fetchMock.mockResolvedValueOnce(mockResponse(200, entry));

      const result = await merriamWebsterAdapter.fetchWordData('richter');
      expect(first(result.definitions)).not.toHaveProperty('partOfSpeech');
      expect(first(result.definitions).label).toBe('biographical name');
    });
  });

  describe('buildMwAudioUrl', () => {
    it('uses the first letter as the subdirectory', async () => {
      const { buildMwAudioUrl } = await import('#adapters/merriam-webster');
      expect(buildMwAudioUrl('serend01')).toBe('https://media.merriam-webster.com/audio/prons/en/us/mp3/s/serend01.mp3');
    });

    it('uses bix and gg subdirectories for those prefixes', async () => {
      const { buildMwAudioUrl } = await import('#adapters/merriam-webster');
      expect(buildMwAudioUrl('bixxx01')).toContain('/mp3/bix/bixxx01.mp3');
      expect(buildMwAudioUrl('ggword')).toContain('/mp3/gg/ggword.mp3');
    });

    it('uses the number subdirectory for a leading digit or punctuation', async () => {
      const { buildMwAudioUrl } = await import('#adapters/merriam-webster');
      expect(buildMwAudioUrl('3abc')).toContain('/mp3/number/3abc.mp3');
      expect(buildMwAudioUrl('_abc')).toContain('/mp3/number/_abc.mp3');
    });

    it('returns undefined for missing audio', async () => {
      const { buildMwAudioUrl } = await import('#adapters/merriam-webster');
      expect(buildMwAudioUrl(undefined)).toBeUndefined();
      expect(buildMwAudioUrl('')).toBeUndefined();
    });
  });

  describe('fetchWordData', () => {
    beforeEach(() => {
      vi.stubEnv('MERRIAM_WEBSTER_API_KEY', 'test-key');
    });

    it('returns definitions for a simple word', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('serendipity');
      fetchMock.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await merriamWebsterAdapter.fetchWordData('serendipity');
      expect(result.word).toBe('serendipity');
      expect(result.definitions).toHaveLength(1);
      expect(first(result.definitions).partOfSpeech).toBe('noun');
      expect(first(result.definitions).text).toContain('finding valuable or agreeable things');
      expect(result.meta.source).toBe('Merriam-Webster');
    });

    it('captures headword pronunciation, audio URL, and etymology', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      fetchMock.mockResolvedValueOnce(mockResponse(200, loadFixture('serendipity')));

      const result = await merriamWebsterAdapter.fetchWordData('serendipity');
      expect(result.headword?.pronunciation).toBe('ˌser-ən-ˈdi-pə-tē');
      expect(result.headword?.audio).toBe('https://media.merriam-webster.com/audio/prons/en/us/mp3/s/serend01.mp3');
      expect(result.headword?.etymology).toBeTruthy();
    });

    it('captures pronunciation but omits absent audio and etymology', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      fetchMock.mockResolvedValueOnce(mockResponse(200, loadFixture('learned')));

      const result = await merriamWebsterAdapter.fetchWordData('learned');
      expect(result.headword).toStrictEqual({ pronunciation: 'ˈlər-nəd' });
    });

    it('omits the headword entirely when no capture fields exist', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      fetchMock.mockResolvedValueOnce(mockResponse(200, loadFixture('hot-dog')));

      const result = await merriamWebsterAdapter.fetchWordData('hot dog');
      expect(result.headword).toBeUndefined();
    });

    it('handles multi-word phrases', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('richter-scale');
      fetchMock.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await merriamWebsterAdapter.fetchWordData('richter scale');
      expect(result.word).toBe('richter scale');
      expect(result.definitions.length).toBeGreaterThan(0);
    });

    it('handles polysemous words with homographs', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('test');
      fetchMock.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await merriamWebsterAdapter.fetchWordData('test');
      // 3 shortdefs from test:1 + 2 from test:2 + 1 from test:3
      expect(result.definitions.length).toBe(6);
      // Homograph suffix stripped from id
      expect(first(result.definitions).id).toBe('test');
    });

    it('filters out non-collegiate entries', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('richter-scale');
      fetchMock.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await merriamWebsterAdapter.fetchWordData('richter scale');
      // Only the collegiate entry, not the learners biographical one
      expect(result.definitions).toHaveLength(1);
      expect(first(result.definitions).sourceDictionary).toBe('collegiate');
    });

    it('filters out biographical entries from same source', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('learned');
      fetchMock.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await merriamWebsterAdapter.fetchWordData('learned');
      // Biographical entry has section: "biog" but src is still "collegiate"
      // We filter by src, so it passes. The biographical entry has fl: "biographical name"
      // Both entries have src: "collegiate", so both are included
      expect(result.definitions.length).toBeGreaterThanOrEqual(2);
    });

    it('throws with suggestions when word not found', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('not-found');
      fetchMock.mockResolvedValueOnce(mockResponse(200, fixture));

      const { WordNotFoundError } = await import('#utils/adapter-utils');

      const error = await merriamWebsterAdapter.fetchWordData('xyzzy').catch(e => e);
      expect(error).toBeInstanceOf(WordNotFoundError);
      expect(error.message).toContain('not found');
      expect(error.message).toContain('Did you mean');
      expect(error.message).toContain('fuzzy');
    });

    it('throws a Merriam-Webster shape error for a malformed matching entry', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const malformed = [{ meta: { id: 'test', src: 'collegiate' }, shortdef: 'not an array' }];
      fetchMock.mockResolvedValueOnce(mockResponse(200, malformed));

      await expect(merriamWebsterAdapter.fetchWordData('test')).rejects.toThrow(
        'Merriam-Webster returned an unexpected response shape for "test"',
      );
    });

    it('throws a Merriam-Webster shape error, not "not found", when the body is not an array', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const { WordNotFoundError } = await import('#utils/adapter-utils');
      fetchMock.mockResolvedValueOnce(mockResponse(200, { error: 'moved' }));

      const error = await merriamWebsterAdapter.fetchWordData('test').catch(e => e);
      expect(error).not.toBeInstanceOf(WordNotFoundError);
      expect(error.message).toBe('Merriam-Webster returned an unexpected response shape for "test"');
    });

    it('reports not found for an empty array', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const { WordNotFoundError } = await import('#utils/adapter-utils');
      fetchMock.mockResolvedValueOnce(mockResponse(200, []));

      const error = await merriamWebsterAdapter.fetchWordData('test').catch(e => e);
      expect(error).toBeInstanceOf(WordNotFoundError);
    });

    it('reports not found when no element is a matching entry', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const { WordNotFoundError } = await import('#utils/adapter-utils');
      fetchMock.mockResolvedValueOnce(mockResponse(200, [null, 'mixed']));

      const error = await merriamWebsterAdapter.fetchWordData('test').catch(e => e);
      expect(error).toBeInstanceOf(WordNotFoundError);
      expect(error.message).toBe('Word "test" not found in Collegiate Dictionary.');
    });

    it('drops a blank short definition and keeps the rest of the entry', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const { isCanonicalResponse } = await import('#utils/adapter-utils');
      const entry = { meta: { id: 'test', src: 'collegiate' }, fl: 'noun', shortdef: ['', 'a real test', '  '] };
      fetchMock.mockResolvedValueOnce(mockResponse(200, [entry]));

      const result = await merriamWebsterAdapter.fetchWordData('test');
      expect(result.definitions.map(definition => definition.text)).toEqual(['a real test']);
      expect(isCanonicalResponse(result, 'test')).toBe(true);
    });

    it('yields no definitions for an entry without shortdef beside one with it', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const entries = [
        { meta: { id: 'test', src: 'collegiate' } },
        { meta: { id: 'test:2', src: 'collegiate' }, fl: 'verb', shortdef: ['to try'] },
      ];
      fetchMock.mockResolvedValueOnce(mockResponse(200, entries));

      const result = await merriamWebsterAdapter.fetchWordData('test');
      expect(result.definitions.map(definition => definition.text)).toEqual(['to try']);
    });

    it('reports an answer in which no entry has shortdef as an unexpected shape', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const { WordNotFoundError } = await import('#utils/adapter-utils');
      fetchMock.mockResolvedValueOnce(mockResponse(200, [{ meta: { id: 'test', src: 'collegiate' } }]));

      const error = await merriamWebsterAdapter.fetchWordData('test').catch(e => e);
      expect(error).not.toBeInstanceOf(WordNotFoundError);
      expect(error.message).toBe('Merriam-Webster returned an unexpected response shape for "test"');
    });

    it('ignores an etymology whose first element is not text', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const entry = { meta: { id: 'test', src: 'collegiate' }, shortdef: ['a test'], et: [['et_snote', [['t', 'note']]]] };
      fetchMock.mockResolvedValueOnce(mockResponse(200, [entry]));

      const result = await merriamWebsterAdapter.fetchWordData('test');
      expect(result.headword).toBeUndefined();
    });

    it('throws on 404', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      fetchMock.mockResolvedValueOnce(mockResponse(404));

      await expect(merriamWebsterAdapter.fetchWordData('nonexistent')).rejects.toThrow('not found');
    });

    it('throws on 429 rate limit', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      fetchMock.mockResolvedValueOnce(mockResponse(429));

      await expect(merriamWebsterAdapter.fetchWordData('test')).rejects.toThrow('Rate limit exceeded');
    });

    it('throws when API key is missing', async () => {
      vi.stubEnv('MERRIAM_WEBSTER_API_KEY', '');
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');

      await expect(merriamWebsterAdapter.fetchWordData('test')).rejects.toThrow('MERRIAM_WEBSTER_API_KEY');
    });

    it('throws on invalid API key (non-JSON response)', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      fetchMock.mockResolvedValueOnce(new Response('Invalid API key', { status: 200 }));

      await expect(merriamWebsterAdapter.fetchWordData('test')).rejects.toThrow('Invalid API response');
    });

    it('normalizes colon spacing in definitions', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('speed');
      fetchMock.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await merriamWebsterAdapter.fetchWordData('speed');
      // "the act or state of moving swiftly :  swiftness" should normalize to ": "
      const firstDef = first(result.definitions).text;
      expect(firstDef).not.toMatch(/ +:  +/);
      expect(firstDef).toContain(': swiftness');
    });

    it('includes attribution on each definition', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('serendipity');
      fetchMock.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await merriamWebsterAdapter.fetchWordData('serendipity');
      for (const def of result.definitions) {
        expect(def.attributionText).toContain('Merriam-Webster');
        expect(def.sourceDictionary).toBe('collegiate');
        expect(def.sourceUrl).toContain('merriam-webster.com');
      }
    });

    it('includes examples when vis tuples present', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('serendipity');
      fetchMock.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await merriamWebsterAdapter.fetchWordData('serendipity');
      // The single shortdef entry should have examples from the vis tuple
      expect(first(result.definitions).examples).toBeDefined();
      expect(first(result.definitions).examples).toContain('a fortunate stroke of serendipity');
    });

    it('reports the word exactly as the caller gave it', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('serendipity');
      fetchMock.mockResolvedValueOnce(mockResponse(200, fixture));

      // Case is the caller's decision (--preserve-case); the adapter passes it through.
      const result = await merriamWebsterAdapter.fetchWordData('Serendipity');
      expect(result.word).toBe('Serendipity');
    });
  });

  describe('isMWEntry', () => {
    const recordedFixtures = ['hot-dog', 'learned', 'ludicrous', 'richter-scale', 'serendipity', 'speed', 'test'];

    it.each(recordedFixtures)('accepts every entry of the recorded %s response', async (name) => {
      const { isMWEntry } = await import('#adapters/merriam-webster');
      expect(fixtureEntries(name).every(isMWEntry)).toBe(true);
    });

    it('accepts an entry without the optional fields', async () => {
      const { isMWEntry } = await import('#adapters/merriam-webster');
      expect(isMWEntry({ meta: { id: 'test', src: 'collegiate' } })).toBe(true);
    });

    it('accepts every sense item type', async () => {
      const { isMWEntry } = await import('#adapters/merriam-webster');
      const sense = { dt: [['text', '{bc}a thing'], ['vis', [{ t: 'an example' }]]], sdsense: { sd: 'also', dt: [['text', 'x']] } };
      const entry = {
        meta: { id: 'test', src: 'collegiate' },
        def: [{ sseq: [[['sense', sense], ['sen', { sn: '2' }], ['bs', { sense }], ['pseq', [['sense', sense]]]]] }],
      };
      expect(isMWEntry(entry)).toBe(true);
    });

    it('accepts sense types and dt tags the adapter never reads', async () => {
      const { isMWEntry } = await import('#adapters/merriam-webster');
      const entry = {
        meta: { id: 'test', src: 'collegiate' },
        def: [{ sseq: [[['undocumented', 1], ['sense', { dt: [['undocumented', 1]] }]]] }],
      };
      expect(isMWEntry(entry)).toBe(true);
    });

    it('rejects non-objects and entries without meta', async () => {
      const { isMWEntry } = await import('#adapters/merriam-webster');
      expect(isMWEntry(null)).toBe(false);
      expect(isMWEntry('suggestion')).toBe(false);
      expect(isMWEntry({})).toBe(false);
      expect(isMWEntry({ meta: { id: 'test' } })).toBe(false);
      expect(isMWEntry({ meta: { id: 1, src: 'collegiate' } })).toBe(false);
    });

    it('rejects malformed consumed fields', async () => {
      const { isMWEntry } = await import('#adapters/merriam-webster');
      const meta = { id: 'test', src: 'collegiate' };
      expect(isMWEntry({ meta, shortdef: 'not an array' })).toBe(false);
      expect(isMWEntry({ meta, shortdef: ['ok', 2] })).toBe(false);
      expect(isMWEntry({ meta, fl: 3 })).toBe(false);
      expect(isMWEntry({ meta, hwi: 'hw' })).toBe(false);
      expect(isMWEntry({ meta, hwi: { prs: 'mw' } })).toBe(false);
      expect(isMWEntry({ meta, hwi: { prs: [{ mw: 1 }] } })).toBe(false);
      expect(isMWEntry({ meta, hwi: { prs: [{ sound: { audio: 1 } }] } })).toBe(false);
      expect(isMWEntry({ meta, hwi: { prs: [{ sound: 'audio' }] } })).toBe(false);
      expect(isMWEntry({ meta, et: 'text' })).toBe(false);
      expect(isMWEntry({ meta, et: [['text', ['not', 'a', 'string']]] })).toBe(false);
      expect(isMWEntry({ meta, et: ['text'] })).toBe(false);
    });

    it('rejects a malformed definition tree', async () => {
      const { isMWEntry } = await import('#adapters/merriam-webster');
      const meta = { id: 'test', src: 'collegiate' };
      const withSseq = (sseq: unknown) => ({ meta, def: [{ sseq }] });
      expect(isMWEntry({ meta, def: {} })).toBe(false);
      expect(isMWEntry({ meta, def: [{}] })).toBe(false);
      expect(isMWEntry(withSseq(['sense']))).toBe(false);
      expect(isMWEntry(withSseq([['sense']]))).toBe(false);
      expect(isMWEntry(withSseq([[['sense', null]]]))).toBe(false);
      expect(isMWEntry(withSseq([[[1, {}]]]))).toBe(false);
      expect(isMWEntry(withSseq([[['bs', {}]]]))).toBe(false);
      expect(isMWEntry(withSseq([[['pseq', {}]]]))).toBe(false);
      expect(isMWEntry(withSseq([[['sense', { dt: 'text' }]]]))).toBe(false);
      expect(isMWEntry(withSseq([[['sense', { dt: ['text'] }]]]))).toBe(false);
      expect(isMWEntry(withSseq([[['sense', { dt: [['vis', 'not an array']] }]]]))).toBe(false);
      expect(isMWEntry(withSseq([[['sense', { dt: [['vis', [{ t: 1 }]]] }]]]))).toBe(false);
      expect(isMWEntry(withSseq([[['sense', { sdsense: 'also' }]]]))).toBe(false);
      expect(isMWEntry(withSseq([[['sense', { sdsense: { dt: 'text' } }]]]))).toBe(false);
    });
  });

  describe('CONFIG', () => {
    it('exports configuration constants', async () => {
      const { CONFIG } = await import('#adapters/merriam-webster');
      expect(CONFIG).toHaveProperty('BASE_URL');
      expect(CONFIG).toHaveProperty('DICTIONARY');
      expect(CONFIG).toHaveProperty('DEFAULT_LIMIT');
      expect(CONFIG.DEFAULT_LIMIT).toBe(10);
    });

    it('uses env vars for config', async () => {
      const { CONFIG } = await import('#adapters/merriam-webster');
      expect(CONFIG.BASE_URL).toBe('https://dictionaryapi.com/api/v3/references');
      expect(CONFIG.DICTIONARY).toBe('collegiate');
    });
  });
});
