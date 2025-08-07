import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { getUrl, getWordUrl } from '~utils-client/url-utils';

describe('WordLink Component Integration', () => {
  beforeEach(() => {
    vi.stubEnv('BASE_PATH', '/');
  });

  describe('getWordUrl', () => {
    it('should return relative path without BASE_PATH processing', () => {
      expect(getWordUrl('serendipity')).toBe('/words/serendipity');
      expect(getWordUrl('ice cream')).toBe('/words/ice cream');
    });

    it('should return empty string for empty word', () => {
      expect(getWordUrl('')).toBe('');
    });

    it('should work regardless of BASE_PATH', () => {
      vi.stubEnv('BASE_PATH', '/occasional-wotd');
      expect(getWordUrl('test')).toBe('/words/test');
    });
  });

  describe('WordLink + SiteLink integration flow', () => {
    it('should prevent double BASE_PATH with no subdirectory', () => {
      vi.stubEnv('BASE_PATH', '/');
      
      const rawPath = getWordUrl('serendipity');
      const processedUrl = getUrl(rawPath);
      
      expect(rawPath).toBe('/words/serendipity');
      expect(processedUrl).toBe('/words/serendipity');
    });

    it('should prevent double BASE_PATH with subdirectory', () => {
      vi.stubEnv('BASE_PATH', '/occasional-wotd');
      
      const rawPath = getWordUrl('serendipity');
      const processedUrl = getUrl(rawPath);
      
      expect(rawPath).toBe('/words/serendipity');
      expect(processedUrl).toBe('/occasional-wotd/words/serendipity');
      expect(processedUrl).not.toContain('/occasional-wotd/occasional-wotd/');
    });

    it('should handle multi-word phrases correctly', () => {
      vi.stubEnv('BASE_PATH', '/occasional-wotd');
      
      const rawPath = getWordUrl('ice cream');
      const processedUrl = getUrl(rawPath);
      
      expect(rawPath).toBe('/words/ice cream');
      expect(processedUrl).toBe('/occasional-wotd/words/ice cream');
    });

    it('should handle special characters in words', () => {
      vi.stubEnv('BASE_PATH', '/occasional-wotd');
      
      const rawPath = getWordUrl("don't");
      const processedUrl = getUrl(rawPath);
      
      expect(rawPath).toBe("/words/don't");
      expect(processedUrl).toBe("/occasional-wotd/words/don't");
    });
  });

  describe('Real-world GitHub Pages scenarios', () => {
    it('should match expected GitHub Pages URLs', () => {
      vi.stubEnv('BASE_PATH', '/occasional-wotd');
      
      const testCases = [
        { word: 'serendipity', expected: '/occasional-wotd/words/serendipity' },
        { word: 'ice cream', expected: '/occasional-wotd/words/ice cream' },
        { word: 'a', expected: '/occasional-wotd/words/a' },
        { word: 'occasional', expected: '/occasional-wotd/words/occasional' }
      ];
      
      for (const { word, expected } of testCases) {
        const rawPath = getWordUrl(word);
        const processedUrl = getUrl(rawPath);
        expect(processedUrl).toBe(expected);
      }
    });

    it('should work correctly for localhost development', () => {
      vi.stubEnv('BASE_PATH', '/');
      
      const rawPath = getWordUrl('test');
      const processedUrl = getUrl(rawPath);
      
      expect(rawPath).toBe('/words/test');
      expect(processedUrl).toBe('/words/test');
    });
  });
});