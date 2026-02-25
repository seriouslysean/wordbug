import { describe, expect, it } from 'vitest';

import { normalizePOS, transformToWordData, transformWordData } from '#utils/adapter-utils';

const TEST_POS_MAP = {
  'transitive verb': 'verb',
  'proper noun': 'noun',
};

describe('adapter-utils', () => {
  describe('normalizePOS', () => {
    it('returns base POS unchanged', () => {
      expect(normalizePOS('noun', TEST_POS_MAP)).toBe('noun');
      expect(normalizePOS('verb', TEST_POS_MAP)).toBe('verb');
      expect(normalizePOS('adjective', TEST_POS_MAP)).toBe('adjective');
    });

    it('normalizes case and whitespace before checking', () => {
      expect(normalizePOS('  Noun  ', TEST_POS_MAP)).toBe('noun');
      expect(normalizePOS('VERB', TEST_POS_MAP)).toBe('verb');
    });

    it('maps known variants via the provided map', () => {
      expect(normalizePOS('transitive verb', TEST_POS_MAP)).toBe('verb');
      expect(normalizePOS('proper noun', TEST_POS_MAP)).toBe('noun');
    });

    it('returns undefined for unmappable values', () => {
      expect(normalizePOS('biographical name', TEST_POS_MAP)).toBeUndefined();
      expect(normalizePOS('abbreviation', TEST_POS_MAP)).toBeUndefined();
    });
  });

  describe('transformToWordData', () => {
    it('produces correct WordData structure', () => {
      const response = {
        word: 'test',
        definitions: [{ text: 'a test', partOfSpeech: 'noun' }],
        meta: { source: 'Test', attribution: 'test', url: '' },
      };

      const result = transformToWordData('test-adapter', response, '20250101');

      expect(result).toEqual({
        word: 'test',
        date: '20250101',
        adapter: 'test-adapter',
        data: response.definitions,
        rawData: response,
      });
    });
  });

  describe('transformWordData', () => {
    it('extracts the first valid definition', () => {
      const wordData = {
        data: [
          { text: 'a definition', partOfSpeech: 'noun', attributionText: 'from Test', sourceUrl: 'https://example.com' },
        ],
      };

      const result = transformWordData(wordData, 'default attribution');

      expect(result.definition).toBe('a definition');
      expect(result.partOfSpeech).toBe('noun');
      expect(result.meta.attributionText).toBe('from Test');
    });

    it('returns empty result for null input', () => {
      expect(transformWordData(null, 'default')).toEqual({
        partOfSpeech: '', definition: '', meta: null,
      });
    });

    it('returns empty result for empty data array', () => {
      expect(transformWordData({ data: [] }, 'default')).toEqual({
        partOfSpeech: '', definition: '', meta: null,
      });
    });

    it('uses default attribution when definition has none', () => {
      const wordData = {
        data: [{ text: 'a definition', partOfSpeech: 'noun' }],
      };

      const result = transformWordData(wordData, 'from Fallback');

      expect(result.meta.attributionText).toBe('from Fallback');
    });

    it('applies processText hook when provided', () => {
      const wordData = {
        data: [{ text: 'raw text', partOfSpeech: 'noun' }],
      };

      const result = transformWordData(wordData, 'default', text => text.toUpperCase());

      expect(result.definition).toBe('RAW TEXT');
    });

    it('skips processText hook when not provided', () => {
      const wordData = {
        data: [{ text: 'raw text', partOfSpeech: 'noun' }],
      };

      const result = transformWordData(wordData, 'default');

      expect(result.definition).toBe('raw text');
    });
  });
});
