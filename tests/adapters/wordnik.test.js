import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

describe('wordnik adapter', () => {
  let wordnikAdapter;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Dynamic import to ensure fresh module
    wordnikAdapter = await import('~/adapters/wordnik.js');
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

  describe('transformExistingWordData', () => {
    it('handles valid word data', async () => {
      const { transformExistingWordData } = wordnikAdapter;
      
      const wordData = {
        data: [
          { text: 'A test definition', partOfSpeech: 'noun' }
        ]
      };

      const result = transformExistingWordData(wordData);
      expect(result.definition).toContain('A test definition');
      expect(result.partOfSpeech).toBe('noun');
    });

    it('handles missing word data', async () => {
      const { transformExistingWordData } = wordnikAdapter;
      
      expect(() => transformExistingWordData(null)).not.toThrow();
      expect(() => transformExistingWordData(undefined)).not.toThrow();
    });
  });

  describe('data transformation', () => {
    it('handles missing data gracefully', async () => {
      const { transformExistingWordData } = wordnikAdapter;
      
      const result = transformExistingWordData(null);
      expect(result).toEqual({ partOfSpeech: '', definition: '', meta: null });
    });

    it('handles empty data arrays', async () => {
      const { transformExistingWordData } = wordnikAdapter;
      
      const wordData = { data: [] };
      const result = transformExistingWordData(wordData);
      expect(result).toEqual({ partOfSpeech: '', definition: '', meta: null });
    });
  });
});