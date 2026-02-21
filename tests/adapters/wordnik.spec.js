import {
 beforeEach,describe, expect, it, vi,
} from 'vitest';

globalThis.fetch = vi.fn();

const mockResponse = (status, data = []) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 404 ? 'Not Found' : status === 429 ? 'Too Many Requests' : 'OK',
  json: () => Promise.resolve(data),
});

const VALID_DEFINITIONS = [
  { id: '1', text: 'A test definition', partOfSpeech: 'noun', attributionText: 'test' },
];

describe('wordnik adapter', () => {
  let adapter;
  let processCrossReferences;
  let processWordnikHTML;
  let transformWordData;
  let WORDNIK_CONFIG;

  beforeEach(async () => {
    vi.clearAllMocks();

    process.env.WORDNIK_WEBSITE_URL = 'https://www.wordnik.com';
    process.env.WORDNIK_API_URL = 'https://api.wordnik.com/v4';

    const mod = await import('#adapters/wordnik');
    adapter = mod.wordnikAdapter;
    processCrossReferences = mod.processCrossReferences;
    processWordnikHTML = mod.processWordnikHTML;
    transformWordData = mod.transformWordData;
    WORDNIK_CONFIG = mod.WORDNIK_CONFIG;
  });

  describe('processCrossReferences', () => {
    it('converts xref tags to wordnik links', () => {
      const input = 'This is an <xref>example</xref> of usage.';
      const expected = 'This is an <a href="https://www.wordnik.com/words/example" target="_blank" rel="noopener noreferrer" class="xref-link">example</a> of usage.';

      expect(processCrossReferences(input)).toBe(expected);
    });

    it('handles multiple xref tags', () => {
      const input = 'See <xref>example</xref> and <xref>test</xref> words.';
      const expected = 'See <a href="https://www.wordnik.com/words/example" target="_blank" rel="noopener noreferrer" class="xref-link">example</a> and <a href="https://www.wordnik.com/words/test" target="_blank" rel="noopener noreferrer" class="xref-link">test</a> words.';

      expect(processCrossReferences(input)).toBe(expected);
    });

    it('handles text without xref tags', () => {
      const input = 'Plain text without references.';
      expect(processCrossReferences(input)).toBe(input);
    });

    it('handles empty or null input', () => {
      expect(processCrossReferences('')).toBe('');
      expect(processCrossReferences(null)).toBe(null);
      expect(processCrossReferences(undefined)).toBe(undefined);
    });
  });

  describe('transformWordData', () => {
    it('handles valid word data', () => {
      const result = transformWordData({
        data: [{ text: 'A test definition', partOfSpeech: 'noun' }],
      });
      expect(result.definition).toContain('A test definition');
      expect(result.partOfSpeech).toBe('noun');
    });

    it('handles missing word data', () => {
      expect(() => transformWordData(null)).not.toThrow();
      expect(() => transformWordData(undefined)).not.toThrow();
    });

    it('handles missing data gracefully', () => {
      expect(transformWordData(null)).toEqual({ partOfSpeech: '', definition: '', meta: null });
    });

    it('handles empty data arrays', () => {
      expect(transformWordData({ data: [] })).toEqual({ partOfSpeech: '', definition: '', meta: null });
    });
  });

  describe('processWordnikHTML', () => {
    it('handles basic HTML sanitization', () => {
      const result = processWordnikHTML('<p>This is <strong>bold</strong> text.</p>');
      expect(result).toContain('bold');
      expect(typeof result).toBe('string');
    });

    it('handles cross-references when preserveXrefs is true', () => {
      const result = processWordnikHTML('See <xref>example</xref> for details.', { preserveXrefs: true });
      expect(result).toContain('href="https://www.wordnik.com/words/example"');
      expect(result).toContain('class="xref-link"');
    });

    it('removes xrefs when preserveXrefs is false', () => {
      const result = processWordnikHTML('See <xref>example</xref> for details.', { preserveXrefs: false });
      expect(result).not.toContain('<xref>');
      expect(result).not.toContain('</xref>');
      expect(result).toContain('example');
    });

    it('handles empty input', () => {
      expect(processWordnikHTML('')).toBe('');
      expect(processWordnikHTML(null)).toBe(null);
      expect(processWordnikHTML(undefined)).toBe(undefined);
    });
  });

  describe('WORDNIK_CONFIG', () => {
    it('exports configuration constants', () => {
      expect(WORDNIK_CONFIG).toHaveProperty('BASE_URL');
      expect(WORDNIK_CONFIG).toHaveProperty('DEFAULT_LIMIT');
      expect(WORDNIK_CONFIG.DEFAULT_LIMIT).toBe(10);
    });
  });

  describe('fetchWordData lowercase fallback', () => {
    beforeEach(() => {
      process.env.WORDNIK_API_KEY = 'test-key';
    });

    it('returns results when lowercase word succeeds directly', async () => {
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, VALID_DEFINITIONS));

      const result = await adapter.fetchWordData('serendipity');
      expect(result.word).toBe('serendipity');
      expect(result.definitions).toHaveLength(1);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('falls back to lowercase when capitalized word returns empty array', async () => {
      globalThis.fetch
        .mockResolvedValueOnce(mockResponse(200, []))
        .mockResolvedValueOnce(mockResponse(200, VALID_DEFINITIONS));

      const result = await adapter.fetchWordData('Serendipity');
      expect(result.word).toBe('serendipity');
      expect(result.definitions).toHaveLength(1);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('falls back to lowercase when capitalized word returns 404', async () => {
      globalThis.fetch
        .mockResolvedValueOnce(mockResponse(404))
        .mockResolvedValueOnce(mockResponse(200, VALID_DEFINITIONS));

      const result = await adapter.fetchWordData('Serendipity');
      expect(result.word).toBe('serendipity');
      expect(result.definitions).toHaveLength(1);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('does not fallback when word is already lowercase', async () => {
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, []));

      await expect(adapter.fetchWordData('serendipity')).rejects.toThrow('not found in dictionary');
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('throws 404 error when both original and lowercase fail', async () => {
      globalThis.fetch
        .mockResolvedValueOnce(mockResponse(404))
        .mockResolvedValueOnce(mockResponse(404));

      await expect(adapter.fetchWordData('Nonexistent')).rejects.toThrow('not found in dictionary');
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('does not fallback on rate limit (429)', async () => {
      globalThis.fetch.mockResolvedValueOnce(mockResponse(429));

      await expect(adapter.fetchWordData('Test')).rejects.toThrow('Rate limit exceeded');
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
