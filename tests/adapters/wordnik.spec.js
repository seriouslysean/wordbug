import {
 beforeEach,describe, expect, it, vi,
} from 'vitest';

globalThis.fetch = vi.fn();

describe('wordnik adapter', () => {
  let wordnikAdapter;

  beforeEach(async () => {
    vi.clearAllMocks();

    process.env.WORDNIK_WEBSITE_URL = 'https://www.wordnik.com';
    process.env.WORDNIK_API_URL = 'https://api.wordnik.com/v4';

    wordnikAdapter = await import('#adapters/wordnik');
  });

  describe('processCrossReferences', () => {
    it('converts xref tags to wordnik links', async () => {
      const { processCrossReferences } = wordnikAdapter;

      const input = 'This is an <xref>example</xref> of usage.';
      const expected = 'This is an <a href="https://www.wordnik.com/words/example" target="_blank" rel="noopener noreferrer" class="xref-link">example</a> of usage.';

      expect(processCrossReferences(input)).toBe(expected);
    });

    it('handles multiple xref tags', async () => {
      const { processCrossReferences } = wordnikAdapter;

      const input = 'See <xref>example</xref> and <xref>test</xref> words.';
      const expected = 'See <a href="https://www.wordnik.com/words/example" target="_blank" rel="noopener noreferrer" class="xref-link">example</a> and <a href="https://www.wordnik.com/words/test" target="_blank" rel="noopener noreferrer" class="xref-link">test</a> words.';

      expect(processCrossReferences(input)).toBe(expected);
    });

    it('handles text without xref tags', async () => {
      const { processCrossReferences } = wordnikAdapter;

      const input = 'Plain text without references.';
      expect(processCrossReferences(input)).toBe(input);
    });

    it('handles empty or null input', async () => {
      const { processCrossReferences } = wordnikAdapter;

      expect(processCrossReferences('')).toBe('');
      expect(processCrossReferences(null)).toBe(null);
      expect(processCrossReferences(undefined)).toBe(undefined);
    });
  });

  describe('transformWordData', () => {
    it('handles valid word data', async () => {
      const { transformWordData } = wordnikAdapter;

      const wordData = {
        data: [
          { text: 'A test definition', partOfSpeech: 'noun' },
        ],
      };

      const result = transformWordData(wordData);
      expect(result.definition).toContain('A test definition');
      expect(result.partOfSpeech).toBe('noun');
    });

    it('handles missing word data', async () => {
      const { transformWordData } = wordnikAdapter;

      expect(() => transformWordData(null)).not.toThrow();
      expect(() => transformWordData(undefined)).not.toThrow();
    });
  });

  describe('data transformation', () => {
    it('handles missing data gracefully', async () => {
      const { transformWordData } = wordnikAdapter;

      const result = transformWordData(null);
      expect(result).toEqual({ partOfSpeech: '', definition: '', meta: null });
    });

    it('handles empty data arrays', async () => {
      const { transformWordData } = wordnikAdapter;

      const wordData = { data: [] };
      const result = transformWordData(wordData);
      expect(result).toEqual({ partOfSpeech: '', definition: '', meta: null });
    });
  });

  describe('processWordnikHTML', () => {
    it('handles basic HTML sanitization', async () => {
      const { processWordnikHTML } = wordnikAdapter;
      const input = '<p>This is <strong>bold</strong> text.</p>';
      const result = processWordnikHTML(input);
      expect(result).toContain('bold');
      expect(typeof result).toBe('string');
    });

    it('handles cross-references when preserveXrefs is true', async () => {
      const { processWordnikHTML } = wordnikAdapter;
      const input = 'See <xref>example</xref> for details.';
      const result = processWordnikHTML(input, { preserveXrefs: true });
      expect(result).toContain('href="https://www.wordnik.com/words/example"');
      expect(result).toContain('class="xref-link"');
    });

    it('removes xrefs when preserveXrefs is false', async () => {
      const { processWordnikHTML } = wordnikAdapter;
      const input = 'See <xref>example</xref> for details.';
      const result = processWordnikHTML(input, { preserveXrefs: false });
      expect(result).not.toContain('<xref>');
      expect(result).not.toContain('</xref>');
      expect(result).toContain('example'); // Content preserved
    });

    it('handles empty input', async () => {
      const { processWordnikHTML } = wordnikAdapter;
      expect(processWordnikHTML('')).toBe('');
      expect(processWordnikHTML(null)).toBe(null);
      expect(processWordnikHTML(undefined)).toBe(undefined);
    });
  });

  describe('WORDNIK_CONFIG', () => {
    it('exports configuration constants', () => {
      const { WORDNIK_CONFIG } = wordnikAdapter;
      expect(WORDNIK_CONFIG).toHaveProperty('BASE_URL');
      expect(WORDNIK_CONFIG).toHaveProperty('DEFAULT_LIMIT');
      expect(WORDNIK_CONFIG.DEFAULT_LIMIT).toBe(10);
    });
  });

  describe('fetchWordData lowercase fallback', () => {
    const validDefinitions = [
      { id: '1', text: 'A test definition', partOfSpeech: 'noun', attributionText: 'test' },
    ];

    beforeEach(() => {
      process.env.WORDNIK_API_KEY = 'test-key';
    });

    it('returns results when lowercase word succeeds directly', async () => {
      const { wordnikAdapter: adapter } = wordnikAdapter;
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(validDefinitions),
      });

      const result = await adapter.fetchWordData('serendipity');
      expect(result.word).toBe('serendipity');
      expect(result.definitions).toHaveLength(1);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('falls back to lowercase when capitalized word returns empty array', async () => {
      const { wordnikAdapter: adapter } = wordnikAdapter;
      // First call: capitalized word returns 200 with empty array
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });
      // Second call: lowercase fallback returns results
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(validDefinitions),
      });

      const result = await adapter.fetchWordData('Serendipity');
      expect(result.word).toBe('serendipity');
      expect(result.definitions).toHaveLength(1);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('falls back to lowercase when capitalized word returns 404', async () => {
      const { wordnikAdapter: adapter } = wordnikAdapter;
      // First call: 404
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });
      // Second call: lowercase fallback returns results
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(validDefinitions),
      });

      const result = await adapter.fetchWordData('Serendipity');
      expect(result.word).toBe('serendipity');
      expect(result.definitions).toHaveLength(1);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('does not fallback when word is already lowercase', async () => {
      const { wordnikAdapter: adapter } = wordnikAdapter;
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await expect(adapter.fetchWordData('serendipity')).rejects.toThrow('No word data found');
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('throws 404 error when both original and lowercase fail', async () => {
      const { wordnikAdapter: adapter } = wordnikAdapter;
      // First call: 404
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });
      // Second call: also 404
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(adapter.fetchWordData('Nonexistent')).rejects.toThrow('not found in dictionary');
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('does not fallback on rate limit (429)', async () => {
      const { wordnikAdapter: adapter } = wordnikAdapter;
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      await expect(adapter.fetchWordData('Test')).rejects.toThrow('Rate limit exceeded');
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
