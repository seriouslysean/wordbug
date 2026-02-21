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
  const mod = {};

  beforeEach(async () => {
    vi.clearAllMocks();

    process.env.WORDNIK_WEBSITE_URL = 'https://www.wordnik.com';
    process.env.WORDNIK_API_URL = 'https://api.wordnik.com/v4';

    Object.assign(mod, await import('#adapters/wordnik'));
  });

  describe('processCrossReferences', () => {
    it('converts xref tags to wordnik links', () => {
      const input = 'This is an <xref>example</xref> of usage.';
      const expected = 'This is an <a href="https://www.wordnik.com/words/example" target="_blank" rel="noopener noreferrer" class="xref-link">example</a> of usage.';

      expect(mod.processCrossReferences(input)).toBe(expected);
    });

    it('handles multiple xref tags', () => {
      const input = 'See <xref>example</xref> and <xref>test</xref> words.';
      const expected = 'See <a href="https://www.wordnik.com/words/example" target="_blank" rel="noopener noreferrer" class="xref-link">example</a> and <a href="https://www.wordnik.com/words/test" target="_blank" rel="noopener noreferrer" class="xref-link">test</a> words.';

      expect(mod.processCrossReferences(input)).toBe(expected);
    });

    it('handles text without xref tags', () => {
      const input = 'Plain text without references.';
      expect(mod.processCrossReferences(input)).toBe(input);
    });

    it('handles empty or null input', () => {
      expect(mod.processCrossReferences('')).toBe('');
      expect(mod.processCrossReferences(null)).toBe(null);
      expect(mod.processCrossReferences(undefined)).toBe(undefined);
    });
  });

  describe('transformWordData', () => {
    it('handles valid word data', () => {
      const result = mod.transformWordData({
        data: [{ text: 'A test definition', partOfSpeech: 'noun' }],
      });
      expect(result.definition).toContain('A test definition');
      expect(result.partOfSpeech).toBe('noun');
    });

    it('handles missing word data', () => {
      expect(() => mod.transformWordData(null)).not.toThrow();
      expect(() => mod.transformWordData(undefined)).not.toThrow();
    });

    it('handles missing data gracefully', () => {
      expect(mod.transformWordData(null)).toEqual({ partOfSpeech: '', definition: '', meta: null });
    });

    it('handles empty data arrays', () => {
      expect(mod.transformWordData({ data: [] })).toEqual({ partOfSpeech: '', definition: '', meta: null });
    });
  });

  describe('processWordnikHTML', () => {
    it('handles basic HTML sanitization', () => {
      const result = mod.processWordnikHTML('<p>This is <strong>bold</strong> text.</p>');
      expect(result).toContain('bold');
      expect(typeof result).toBe('string');
    });

    it('handles cross-references when preserveXrefs is true', () => {
      const result = mod.processWordnikHTML('See <xref>example</xref> for details.', { preserveXrefs: true });
      expect(result).toContain('href="https://www.wordnik.com/words/example"');
      expect(result).toContain('class="xref-link"');
    });

    it('removes xrefs when preserveXrefs is false', () => {
      const result = mod.processWordnikHTML('See <xref>example</xref> for details.', { preserveXrefs: false });
      expect(result).not.toContain('<xref>');
      expect(result).not.toContain('</xref>');
      expect(result).toContain('example');
    });

    it('handles empty input', () => {
      expect(mod.processWordnikHTML('')).toBe('');
      expect(mod.processWordnikHTML(null)).toBe(null);
      expect(mod.processWordnikHTML(undefined)).toBe(undefined);
    });
  });

  describe('WORDNIK_CONFIG', () => {
    it('exports configuration constants', () => {
      expect(mod.WORDNIK_CONFIG).toHaveProperty('BASE_URL');
      expect(mod.WORDNIK_CONFIG).toHaveProperty('DEFAULT_LIMIT');
      expect(mod.WORDNIK_CONFIG.DEFAULT_LIMIT).toBe(10);
    });
  });

  describe('fetchWordData lowercase fallback', () => {
    beforeEach(() => {
      process.env.WORDNIK_API_KEY = 'test-key';
    });

    it('returns results when lowercase word succeeds directly', async () => {
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, VALID_DEFINITIONS));

      const result = await mod.wordnikAdapter.fetchWordData('serendipity');
      expect(result.word).toBe('serendipity');
      expect(result.definitions).toHaveLength(1);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('falls back to lowercase when capitalized word returns empty array', async () => {
      globalThis.fetch
        .mockResolvedValueOnce(mockResponse(200, []))
        .mockResolvedValueOnce(mockResponse(200, VALID_DEFINITIONS));

      const result = await mod.wordnikAdapter.fetchWordData('Serendipity');
      expect(result.word).toBe('serendipity');
      expect(result.definitions).toHaveLength(1);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('falls back to lowercase when capitalized word returns 404', async () => {
      globalThis.fetch
        .mockResolvedValueOnce(mockResponse(404))
        .mockResolvedValueOnce(mockResponse(200, VALID_DEFINITIONS));

      const result = await mod.wordnikAdapter.fetchWordData('Serendipity');
      expect(result.word).toBe('serendipity');
      expect(result.definitions).toHaveLength(1);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('does not fallback when word is already lowercase', async () => {
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, []));

      await expect(mod.wordnikAdapter.fetchWordData('serendipity')).rejects.toThrow('not found in dictionary');
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('throws 404 error when both original and lowercase fail', async () => {
      globalThis.fetch
        .mockResolvedValueOnce(mockResponse(404))
        .mockResolvedValueOnce(mockResponse(404));

      await expect(mod.wordnikAdapter.fetchWordData('Nonexistent')).rejects.toThrow('not found in dictionary');
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('does not fallback on rate limit (429)', async () => {
      globalThis.fetch.mockResolvedValueOnce(mockResponse(429));

      await expect(mod.wordnikAdapter.fetchWordData('Test')).rejects.toThrow('Rate limit exceeded');
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
