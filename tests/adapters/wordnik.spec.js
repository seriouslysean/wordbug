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
});
