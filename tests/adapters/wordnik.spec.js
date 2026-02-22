import {
 beforeEach,describe, expect, it, vi,
} from 'vitest';

globalThis.fetch = vi.fn();

const STATUS_TEXT = { 404: 'Not Found', 429: 'Too Many Requests' };
const mockResponse = (status, data = []) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: STATUS_TEXT[status] || 'OK',
  json: () => Promise.resolve(data),
});

const VALID_DEFINITIONS = [
  { id: '1', text: 'A test definition', partOfSpeech: 'noun', attributionText: 'test' },
];

describe('wordnik adapter', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('WORDNIK_WEBSITE_URL', 'https://www.wordnik.com');
    vi.stubEnv('WORDNIK_API_URL', 'https://api.wordnik.com/v4');
  });

  describe('processCrossReferences', () => {
    it('converts xref tags to wordnik links', async () => {
      const { processCrossReferences } = await import('#adapters/wordnik');
      const input = 'This is an <xref>example</xref> of usage.';
      const expected = 'This is an <a href="https://www.wordnik.com/words/example" target="_blank" rel="noopener noreferrer" class="xref-link">example</a> of usage.';

      expect(processCrossReferences(input)).toBe(expected);
    });

    it('handles multiple xref tags', async () => {
      const { processCrossReferences } = await import('#adapters/wordnik');
      const input = 'See <xref>example</xref> and <xref>test</xref> words.';
      const expected = 'See <a href="https://www.wordnik.com/words/example" target="_blank" rel="noopener noreferrer" class="xref-link">example</a> and <a href="https://www.wordnik.com/words/test" target="_blank" rel="noopener noreferrer" class="xref-link">test</a> words.';

      expect(processCrossReferences(input)).toBe(expected);
    });

    it('handles text without xref tags', async () => {
      const { processCrossReferences } = await import('#adapters/wordnik');
      const input = 'Plain text without references.';
      expect(processCrossReferences(input)).toBe(input);
    });

    it('handles empty or null input', async () => {
      const { processCrossReferences } = await import('#adapters/wordnik');
      expect(processCrossReferences('')).toBe('');
      expect(processCrossReferences(null)).toBe(null);
      expect(processCrossReferences(undefined)).toBe(undefined);
    });
  });

  describe('transformWordData', () => {
    it('handles valid word data', async () => {
      const { transformWordData } = await import('#adapters/wordnik');
      const result = transformWordData({
        data: [{ text: 'A test definition', partOfSpeech: 'noun' }],
      });
      expect(result.definition).toContain('A test definition');
      expect(result.partOfSpeech).toBe('noun');
    });

    it('handles missing word data', async () => {
      const { transformWordData } = await import('#adapters/wordnik');
      expect(() => transformWordData(null)).not.toThrow();
      expect(() => transformWordData(undefined)).not.toThrow();
    });

    it('handles missing data gracefully', async () => {
      const { transformWordData } = await import('#adapters/wordnik');
      expect(transformWordData(null)).toEqual({ partOfSpeech: '', definition: '', meta: null });
    });

    it('handles empty data arrays', async () => {
      const { transformWordData } = await import('#adapters/wordnik');
      expect(transformWordData({ data: [] })).toEqual({ partOfSpeech: '', definition: '', meta: null });
    });
  });

  describe('processWordnikHTML', () => {
    it('handles basic HTML sanitization', async () => {
      const { processWordnikHTML } = await import('#adapters/wordnik');
      const result = processWordnikHTML('<p>This is <strong>bold</strong> text.</p>');
      expect(result).toContain('bold');
      expect(typeof result).toBe('string');
    });

    it('handles cross-references when preserveXrefs is true', async () => {
      const { processWordnikHTML } = await import('#adapters/wordnik');
      const result = processWordnikHTML('See <xref>example</xref> for details.', { preserveXrefs: true });
      expect(result).toContain('href="https://www.wordnik.com/words/example"');
      expect(result).toContain('class="xref-link"');
    });

    it('removes xrefs when preserveXrefs is false', async () => {
      const { processWordnikHTML } = await import('#adapters/wordnik');
      const result = processWordnikHTML('See <xref>example</xref> for details.', { preserveXrefs: false });
      expect(result).not.toContain('<xref>');
      expect(result).not.toContain('</xref>');
      expect(result).toContain('example');
    });

    it('handles empty input', async () => {
      const { processWordnikHTML } = await import('#adapters/wordnik');
      expect(processWordnikHTML('')).toBe('');
      expect(processWordnikHTML(null)).toBe(null);
      expect(processWordnikHTML(undefined)).toBe(undefined);
    });
  });

  describe('WORDNIK_CONFIG', () => {
    it('exports configuration constants', async () => {
      const { WORDNIK_CONFIG } = await import('#adapters/wordnik');
      expect(WORDNIK_CONFIG).toHaveProperty('BASE_URL');
      expect(WORDNIK_CONFIG).toHaveProperty('DEFAULT_LIMIT');
      expect(WORDNIK_CONFIG.DEFAULT_LIMIT).toBe(10);
    });
  });

  describe('fetchWordData', () => {
    beforeEach(() => {
      vi.stubEnv('WORDNIK_API_KEY', 'test-key');
    });

    it('returns definitions for a valid word', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, VALID_DEFINITIONS));

      const result = await wordnikAdapter.fetchWordData('serendipity');
      expect(result.word).toBe('serendipity');
      expect(result.definitions).toHaveLength(1);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('makes exactly one request per lookup', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, VALID_DEFINITIONS));

      await wordnikAdapter.fetchWordData('Serendipity');
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('throws when word returns empty results', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(200, []));

      await expect(wordnikAdapter.fetchWordData('serendipity')).rejects.toThrow('not found in dictionary');
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('throws when word returns 404', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(404));

      await expect(wordnikAdapter.fetchWordData('nonexistent')).rejects.toThrow('not found in dictionary');
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('throws on rate limit (429)', async () => {
      const { wordnikAdapter } = await import('#adapters/wordnik');
      globalThis.fetch.mockResolvedValueOnce(mockResponse(429));

      await expect(wordnikAdapter.fetchWordData('test')).rejects.toThrow('Rate limit exceeded');
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
