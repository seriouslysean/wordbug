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
});

const FIXTURES_DIR = path.join(import.meta.dirname, 'fixtures', 'wiktionary');
const loadFixture = (name) => JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, `${name}.json`), 'utf-8'));

describe('wiktionary adapter', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('fetchWordData', () => {
    it('returns definitions for a word with one meaning', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const fixture = loadFixture('pneumonoultramicroscopicsilicovolcanoconiosis');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await wiktionaryAdapter.fetchWordData('pneumonoultramicroscopicsilicovolcanoconiosis');
      expect(result.word).toBe('pneumonoultramicroscopicsilicovolcanoconiosis');
      expect(result.definitions).toHaveLength(1);
      expect(result.definitions[0].partOfSpeech).toBe('noun');
      expect(result.definitions[0].text).toContain('disease of the lungs');
      expect(result.meta.source).toBe('Wiktionary');
    });

    it('returns multiple definitions from multiple meanings', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const fixture = loadFixture('serendipity');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await wiktionaryAdapter.fetchWordData('serendipity');
      expect(result.word).toBe('serendipity');
      expect(result.definitions).toHaveLength(2);
      expect(result.definitions.every(d => d.partOfSpeech === 'noun')).toBe(true);
    });

    it('lowercases the word in the response', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const fixture = loadFixture('serendipity');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await wiktionaryAdapter.fetchWordData('Serendipity');
      expect(result.word).toBe('serendipity');
    });

    it('throws on 404', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(404));

      await expect(wiktionaryAdapter.fetchWordData('xyzzy')).rejects.toThrow('not found');
    });

    it('throws on server error', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(500));

      await expect(wiktionaryAdapter.fetchWordData('test')).rejects.toThrow('Failed to fetch');
    });

    it('includes attribution on each definition', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const fixture = loadFixture('serendipity');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, fixture));

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
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await wiktionaryAdapter.fetchWordData('serendipity');
      const defWithSynonyms = result.definitions.find(d => d.synonyms?.length);
      expect(defWithSynonyms).toBeDefined();
      expect(defWithSynonyms.synonyms).toContain('chance');
    });
  });

  describe('POS normalization', () => {
    it('passes through base POS unchanged', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const fixture = loadFixture('serendipity');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, fixture));

      const result = await wiktionaryAdapter.fetchWordData('serendipity');
      expect(result.definitions[0].partOfSpeech).toBe('noun');
    });

    it('normalizes exclamation to interjection', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const entry = [{
        word: 'wow',
        phonetics: [],
        meanings: [{ partOfSpeech: 'exclamation', definitions: [{ definition: 'An expression of surprise' }] }],
        sourceUrls: ['https://en.wiktionary.org/wiki/wow'],
      }];
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, entry));

      const result = await wiktionaryAdapter.fetchWordData('wow');
      expect(result.definitions[0].partOfSpeech).toBe('interjection');
    });
  });

  describe('transformWordData', () => {
    it('transforms valid word data', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const result = wiktionaryAdapter.transformWordData({
        data: [{ text: 'a definition', partOfSpeech: 'noun', attributionText: 'from Wiktionary', sourceUrl: 'https://en.wiktionary.org' }],
      });
      expect(result.definition).toBe('a definition');
      expect(result.partOfSpeech).toBe('noun');
      expect(result.meta.attributionText).toBe('from Wiktionary');
    });

    it('handles null input', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      expect(wiktionaryAdapter.transformWordData(null)).toEqual({ partOfSpeech: '', definition: '', meta: null });
    });

    it('handles empty data array', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      expect(wiktionaryAdapter.transformWordData({ data: [] })).toEqual({ partOfSpeech: '', definition: '', meta: null });
    });
  });

  describe('transformToWordData', () => {
    it('creates word data with wiktionary adapter field', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const response = {
        word: 'test',
        definitions: [{ text: 'a test', partOfSpeech: 'noun' }],
        meta: { source: 'Wiktionary', attribution: 'from Wiktionary', url: '' },
      };

      const result = wiktionaryAdapter.transformToWordData(response, '20250101');
      expect(result.adapter).toBe('wiktionary');
      expect(result.word).toBe('test');
      expect(result.date).toBe('20250101');
      expect(result.data).toEqual(response.definitions);
    });
  });

  describe('isValidResponse', () => {
    it('returns true for valid entry arrays', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const fixture = loadFixture('serendipity');
      expect(wiktionaryAdapter.isValidResponse(fixture)).toBe(true);
    });

    it('returns false for empty arrays', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      expect(wiktionaryAdapter.isValidResponse([])).toBe(false);
    });

    it('returns false for non-arrays', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      const fixture = loadFixture('not-found');
      expect(wiktionaryAdapter.isValidResponse(fixture)).toBe(false);
      expect(wiktionaryAdapter.isValidResponse(null)).toBe(false);
      expect(wiktionaryAdapter.isValidResponse(undefined)).toBe(false);
    });

    it('returns false for entries without meanings', async () => {
      const { wiktionaryAdapter } = await import('#adapters/wiktionary');
      expect(wiktionaryAdapter.isValidResponse([{ word: 'test', meanings: [] }])).toBe(false);
    });
  });
});
