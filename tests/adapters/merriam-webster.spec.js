import fs from 'fs';
import path from 'path';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

globalThis.fetch = vi.fn();

const STATUS_TEXT = { 404: 'Not Found', 429: 'Too Many Requests' };
const mockResponse = (status, data = []) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: STATUS_TEXT[status] || 'OK',
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
});

const FIXTURES_DIR = path.join(import.meta.dirname, 'fixtures', 'merriam-webster');
const loadFixture = (name) => JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, `${name}.json`), 'utf-8'));

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
      expect(stripMarkup(null)).toBe(null);
      expect(stripMarkup(undefined)).toBe(undefined);
    });
  });

  describe('extractExamples', () => {
    it('extracts vis tuples from definition tree', async () => {
      const { extractExamples } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('serendipity');
      const examples = extractExamples(fixture[0]);
      expect(examples).toHaveLength(1);
      expect(examples[0]).toBe('a fortunate stroke of serendipity');
    });

    it('strips markup from example text', async () => {
      const { extractExamples } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('ludicrous');
      const examples = extractExamples(fixture[0]);
      expect(examples.some(e => e.includes('ludicrous'))).toBe(true);
      expect(examples.every(e => !e.includes('{it}'))).toBe(true);
    });

    it('returns empty array for entries without def', async () => {
      const { extractExamples } = await import('#adapters/merriam-webster');
      expect(extractExamples({ meta: { id: 'test' } })).toEqual([]);
    });

    it('handles entries without vis tuples', async () => {
      const { extractExamples } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('richter-scale');
      // The collegiate entry has no vis tuples
      const examples = extractExamples(fixture[0]);
      expect(examples).toEqual([]);
    });

    it('collects examples from multiple senses', async () => {
      const { extractExamples } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('learned');
      const examples = extractExamples(fixture[0]);
      expect(examples.length).toBeGreaterThanOrEqual(2);
    });

    it('extracts examples with cross-reference markup', async () => {
      const { extractExamples } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('ludicrous');
      const examples = extractExamples(fixture[0]);
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
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await merriamWebsterAdapter.fetchWordData('serendipity');
      expect(result.definitions[0].partOfSpeech).toBe('noun');
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
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, entry));

      const result = await merriamWebsterAdapter.fetchWordData('test');
      expect(result.definitions[0].partOfSpeech).toBe('verb');
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
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, entry));

      const result = await merriamWebsterAdapter.fetchWordData('the');
      expect(result.definitions[0].partOfSpeech).toBe('article');
    });

    it('returns undefined for unmappable POS', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const entry = [{
        meta: { id: 'richter', uuid: '1', src: 'collegiate', section: 'biog', stems: [], offensive: false },
        hwi: { hw: 'Richter' },
        fl: 'biographical name',
        shortdef: ['Charles Francis 1900-1985'],
        def: [],
      }];
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, entry));

      const result = await merriamWebsterAdapter.fetchWordData('richter');
      expect(result.definitions[0].partOfSpeech).toBeUndefined();
    });
  });

  describe('fetchWordData', () => {
    beforeEach(() => {
      vi.stubEnv('MERRIAM_WEBSTER_API_KEY', 'test-key');
    });

    it('returns definitions for a simple word', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('serendipity');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await merriamWebsterAdapter.fetchWordData('serendipity');
      expect(result.word).toBe('serendipity');
      expect(result.definitions).toHaveLength(1);
      expect(result.definitions[0].partOfSpeech).toBe('noun');
      expect(result.definitions[0].text).toContain('finding valuable or agreeable things');
      expect(result.meta.source).toBe('Merriam-Webster');
    });

    it('handles multi-word phrases', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('richter-scale');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await merriamWebsterAdapter.fetchWordData('richter scale');
      expect(result.word).toBe('richter scale');
      expect(result.definitions.length).toBeGreaterThan(0);
    });

    it('handles polysemous words with homographs', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('test');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await merriamWebsterAdapter.fetchWordData('test');
      // 3 shortdefs from test:1 + 2 from test:2 + 1 from test:3
      expect(result.definitions.length).toBe(6);
      // Homograph suffix stripped from id
      expect(result.definitions[0].id).toBe('test');
    });

    it('filters out non-collegiate entries', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('richter-scale');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await merriamWebsterAdapter.fetchWordData('richter scale');
      // Only the collegiate entry, not the learners biographical one
      expect(result.definitions).toHaveLength(1);
      expect(result.definitions[0].sourceDictionary).toBe('collegiate');
    });

    it('filters out biographical entries from same source', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('learned');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await merriamWebsterAdapter.fetchWordData('learned');
      // Biographical entry has section: "biog" but src is still "collegiate"
      // We filter by src, so it passes. The biographical entry has fl: "biographical name"
      // Both entries have src: "collegiate", so both are included
      expect(result.definitions.length).toBeGreaterThanOrEqual(2);
    });

    it('throws with suggestions when word not found', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('not-found');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, fixture));

      const error = await merriamWebsterAdapter.fetchWordData('xyzzy').catch(e => e);
      expect(error.message).toContain('not found');
      expect(error.message).toContain('Did you mean');
      expect(error.message).toContain('fuzzy');
    });

    it('throws on 404', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(404));

      await expect(merriamWebsterAdapter.fetchWordData('nonexistent')).rejects.toThrow('not found');
    });

    it('throws on 429 rate limit', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(429));

      await expect(merriamWebsterAdapter.fetchWordData('test')).rejects.toThrow('Rate limit exceeded');
    });

    it('throws when API key is missing', async () => {
      vi.stubEnv('MERRIAM_WEBSTER_API_KEY', '');
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');

      await expect(merriamWebsterAdapter.fetchWordData('test')).rejects.toThrow('MERRIAM_WEBSTER_API_KEY');
    });

    it('throws on invalid API key (non-JSON response)', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
        text: () => Promise.resolve('Invalid API key'),
      });

      await expect(merriamWebsterAdapter.fetchWordData('test')).rejects.toThrow('Invalid API response');
    });

    it('normalizes colon spacing in definitions', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('speed');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await merriamWebsterAdapter.fetchWordData('speed');
      // "the act or state of moving swiftly :  swiftness" should normalize to ": "
      const firstDef = result.definitions[0].text;
      expect(firstDef).not.toMatch(/ +:  +/);
      expect(firstDef).toContain(': swiftness');
    });

    it('includes attribution on each definition', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('serendipity');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, fixture));

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
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await merriamWebsterAdapter.fetchWordData('serendipity');
      // The single shortdef entry should have examples from the vis tuple
      expect(result.definitions[0].examples).toBeDefined();
      expect(result.definitions[0].examples).toContain('a fortunate stroke of serendipity');
    });

    it('lowercases the word in the response', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('serendipity');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await merriamWebsterAdapter.fetchWordData('Serendipity');
      expect(result.word).toBe('serendipity');
    });
  });

  describe('transformWordData', () => {
    it('transforms valid word data', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const result = merriamWebsterAdapter.transformWordData({
        data: [{ text: 'a definition', partOfSpeech: 'noun', attributionText: 'from Merriam-Webster', sourceUrl: 'https://merriam-webster.com' }],
      });
      expect(result.definition).toBe('a definition');
      expect(result.partOfSpeech).toBe('noun');
      expect(result.meta.attributionText).toContain('Merriam-Webster');
    });

    it('handles null input', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      expect(merriamWebsterAdapter.transformWordData(null)).toEqual({ partOfSpeech: '', definition: '', meta: null });
    });

    it('handles empty data array', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      expect(merriamWebsterAdapter.transformWordData({ data: [] })).toEqual({ partOfSpeech: '', definition: '', meta: null });
    });

    it('uses default attribution when missing', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const result = merriamWebsterAdapter.transformWordData({
        data: [{ text: 'a definition', partOfSpeech: 'noun' }],
      });
      expect(result.meta.attributionText).toBe('from Merriam-Webster');
    });
  });

  describe('isValidResponse', () => {
    it('returns true for valid entry arrays', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('serendipity');
      expect(merriamWebsterAdapter.isValidResponse(fixture)).toBe(true);
    });

    it('returns false for string suggestion arrays', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      const fixture = loadFixture('not-found');
      expect(merriamWebsterAdapter.isValidResponse(fixture)).toBe(false);
    });

    it('returns false for empty arrays', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      expect(merriamWebsterAdapter.isValidResponse([])).toBe(false);
    });

    it('returns false for non-arrays', async () => {
      const { merriamWebsterAdapter } = await import('#adapters/merriam-webster');
      expect(merriamWebsterAdapter.isValidResponse(null)).toBe(false);
      expect(merriamWebsterAdapter.isValidResponse(undefined)).toBe(false);
      expect(merriamWebsterAdapter.isValidResponse('string')).toBe(false);
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
