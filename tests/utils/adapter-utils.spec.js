import { describe, expect, it } from 'vitest';

import {
  normalizePOS,
  parseJsonResponse,
  throwOnHttpError,
  throwWordNotFound,
  transformToWordData,
  transformWordData,
} from '#utils/adapter-utils';

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

  describe('throwOnHttpError', () => {
    it('does nothing for ok responses', () => {
      const response = { ok: true, status: 200 };
      expect(() => throwOnHttpError(response, 'test')).not.toThrow();
    });

    it('throws rate limit error for 429', () => {
      const response = { ok: false, status: 429 };
      expect(() => throwOnHttpError(response, 'test')).toThrow('Rate limit exceeded');
    });

    it('throws word not found for 404', () => {
      const response = { ok: false, status: 404 };
      expect(() => throwOnHttpError(response, 'serendipity')).toThrow(
        'Word "serendipity" not found in dictionary',
      );
    });

    it('throws generic error with statusText for other failures', () => {
      const response = { ok: false, status: 500, statusText: 'Internal Server Error' };
      expect(() => throwOnHttpError(response, 'test')).toThrow(
        'Failed to fetch word data: Internal Server Error',
      );
    });
  });

  describe('parseJsonResponse', () => {
    it('parses valid JSON response', async () => {
      const response = { json: () => Promise.resolve({ word: 'test' }) };
      const result = await parseJsonResponse(response, 'TestAPI');
      expect(result).toEqual({ word: 'test' });
    });

    it('throws with response text on parse failure', async () => {
      const response = {
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
        text: () => Promise.resolve('<html>Invalid API Key</html>'),
      };
      await expect(parseJsonResponse(response, 'TestAPI')).rejects.toThrow(
        'Invalid API response (not JSON) from TestAPI',
      );
    });

    it('truncates long error responses', async () => {
      const response = {
        json: () => Promise.reject(new SyntaxError()),
        text: () => Promise.resolve('x'.repeat(500)),
      };
      const error = await parseJsonResponse(response, 'TestAPI').catch(e => e);
      expect(error.message.length).toBeLessThan(300);
    });
  });

  describe('throwWordNotFound', () => {
    it('throws with consistent message format', () => {
      expect(() => throwWordNotFound('serendipity')).toThrow(
        'Word "serendipity" not found in dictionary. Please check the spelling.',
      );
    });
  });
});
