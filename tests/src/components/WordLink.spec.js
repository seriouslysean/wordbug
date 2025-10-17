import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { getUrl, getWordUrl } from '~astro-utils/url-utils';

describe('WordLink Component Integration', () => {
  beforeEach(() => {
    vi.stubGlobal('__BASE_URL__', '/');
  });

  describe('getWordUrl', () => {
    it('should return slugified word URLs', () => {
      expect(getWordUrl('serendipity')).toBe('/word/serendipity');
      expect(getWordUrl('ice cream')).toBe('/word/ice-cream');
      expect(getWordUrl("don't")).toBe('/word/dont');
    });

    it('should return empty string for empty word', () => {
      expect(getWordUrl('')).toBe('');
    });

    it('should work regardless of BASE_PATH', () => {
      vi.stubEnv('BASE_PATH', '/occasional-wotd');
      expect(getWordUrl('test')).toBe('/word/test');
    });
  });

  describe('WordLink + SiteLink integration flow', () => {
    it('should prevent double BASE_PATH with no subdirectory', () => {
      const rawPath = getWordUrl('serendipity');
      const processedUrl = getUrl(rawPath);

      expect(rawPath).toBe('/word/serendipity');
      expect(processedUrl).toBe('/word/serendipity');
    });

    it('should prevent double BASE_PATH with subdirectory', () => {
      vi.stubGlobal('__BASE_URL__', '/occasional-wotd');

      const rawPath = getWordUrl('serendipity');
      const processedUrl = getUrl(rawPath);

      expect(rawPath).toBe('/word/serendipity');
      expect(processedUrl).toBe('/occasional-wotd/word/serendipity');
      expect(processedUrl).not.toContain('/occasional-wotd/occasional-wotd/');
    });

    it('should handle multi-word phrases correctly', () => {
      vi.stubGlobal('__BASE_URL__', '/occasional-wotd');

      const rawPath = getWordUrl('ice cream');
      const processedUrl = getUrl(rawPath);

      expect(rawPath).toBe('/word/ice-cream');
      expect(processedUrl).toBe('/occasional-wotd/word/ice-cream');
    });

    it('should handle special characters in words', () => {
      vi.stubGlobal('__BASE_URL__', '/occasional-wotd');

      const rawPath = getWordUrl("don't");
      const processedUrl = getUrl(rawPath);

      expect(rawPath).toBe('/word/dont');
      expect(processedUrl).toBe('/occasional-wotd/word/dont');
    });
  });

  describe('Real-world GitHub Pages scenarios', () => {
    it('should generate correct URLs with subdirectory base path', () => {
      vi.stubGlobal('__BASE_URL__', '/occasional-wotd');

      const testCases = [
        { input: 'serendipity', expected: '/occasional-wotd/word/serendipity' },
        { input: 'ice cream', expected: '/occasional-wotd/word/ice-cream' },
        { input: 'a', expected: '/occasional-wotd/word/a' },
        { input: 'occasional', expected: '/occasional-wotd/word/occasional' }
      ];

      for (const { input, expected } of testCases) {
        const rawPath = getWordUrl(input);
        const processedUrl = getUrl(rawPath);
        expect(processedUrl).toBe(expected);
      }
    });

    it('should work correctly for localhost development', () => {
      const rawPath = getWordUrl('test');
      const processedUrl = getUrl(rawPath);

      expect(rawPath).toBe('/word/test');
      expect(processedUrl).toBe('/word/test');
    });
  });
});
