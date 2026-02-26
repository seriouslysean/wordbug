import {
 beforeEach, describe, expect, it,
} from 'vitest';

import {
  getBasePath,
  getPathname,
  getFullUrl,
  getUrl,
  stripBasePath,
  slugify,
  getWordsUrl,
  getStatsUrl,
  getWordsLengthUrl,
  getWordsLetterUrl,
  getWordsYearUrl,
  getLengthUrl,
  getLetterUrl,
  getMonthUrl,
  getStatUrl,
} from '#astro-utils/url-utils';

describe('utils', () => {
  describe('slugify', () => {
    it('converts strings to URL-safe slugs', () => {
      expect(slugify('hello world')).toBe('hello-world');
      expect(slugify('ice cream')).toBe('ice-cream');
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('removes special characters', () => {
      expect(slugify("don't")).toBe('dont');
      expect(slugify('hello & world')).toBe('hello-world');
      expect(slugify('test!@#$%^&*()_+={[}]|\\:";\'<>?,./`~')).toBe('test_');
    });

    it('handles multiple spaces and dashes', () => {
      expect(slugify('hello    world')).toBe('hello-world');
      expect(slugify('hello--world')).toBe('hello-world');
      expect(slugify('hello - - world')).toBe('hello-world');
    });

    it('trims leading and trailing dashes', () => {
      expect(slugify('-hello world-')).toBe('hello-world');
      expect(slugify('--hello--')).toBe('hello');
      expect(slugify('---')).toBe('');
    });

    it('handles empty strings and edge cases', () => {
      expect(slugify('')).toBe('');
      expect(slugify('   ')).toBe('');
      expect(slugify('123')).toBe('123');
      expect(slugify('a')).toBe('a');
    });

    it('preserves underscores and numbers', () => {
      expect(slugify('test_123')).toBe('test_123');
      expect(slugify('word-2024')).toBe('word-2024');
      expect(slugify('hello_world 123')).toBe('hello_world-123');
    });
  });

  describe('getUrl', () => {
    beforeEach(() => {
      mockEnv.BASE_PATH = '/';
    });

    it('handles paths with default base path', () => {
      expect(getUrl('/20240319')).toBe('/20240319');
    });

    it('handles paths with custom base path', () => {
      mockEnv.BASE_PATH = '/blog';
      expect(getUrl('/20240319')).toBe('/blog/20240319');
    });

    it('handles paths with custom base path with trailing slash', () => {
      mockEnv.BASE_PATH = '/blog/';
      expect(getUrl('/20240319')).toBe('/blog/20240319');
    });

    it('handles empty or undefined base path', () => {
      mockEnv.BASE_PATH = '';
      expect(getUrl('/20240319')).toBe('/20240319');
    });

    it('handles empty paths', () => {
      expect(getUrl('/')).toBe('/');
    });

    it('preserves trailing slashes for root path only', () => {
      expect(getUrl('/')).toBe('/');
    });

    it('ignores SITE_URL when building relative URLs', () => {
      mockEnv.BASE_PATH = '/blog';
      mockEnv.SITE_URL = 'https://example.com';
      expect(getUrl('/words/hello')).toBe('/blog/words/hello');
    });

    it('preserves case for base path and path', () => {
      mockEnv.BASE_PATH = '/Blog';
      expect(getUrl('/ABC')).toBe('/Blog/ABC');
    });
  });

  describe('getFullUrl', () => {
    beforeEach(() => {
      mockEnv.BASE_PATH = '/';
      mockEnv.SITE_URL = 'https://example.com';
    });

    it('combines SITE_URL with getUrl() result', () => {
      expect(getFullUrl('/words/hello')).toBe('https://example.com/words/hello');
    });

    it('handles subdirectory deployments correctly', () => {
      mockEnv.BASE_PATH = '/vocab';
      expect(getFullUrl('/words/hello')).toBe('https://example.com/vocab/words/hello');
    });

    it('handles root path correctly', () => {
      expect(getFullUrl('/')).toBe('https://example.com/');
    });

    it('throws when SITE_URL is missing', () => {
      mockEnv.SITE_URL = '';
      expect(() => getFullUrl('/test')).toThrow('SITE_URL environment variable is required');
    });

    it('removes trailing slash from SITE_URL', () => {
      mockEnv.SITE_URL = 'https://example.com/';
      expect(getFullUrl('/test')).toBe('https://example.com/test');
    });

    it('uses default site URL when none provided', () => {
      mockEnv.SITE_URL = '';
      expect(() => getFullUrl('/')).toThrow('SITE_URL environment variable is required');
    });
  });

  describe('URL helper functions', () => {
    describe('Section URLs', () => {
      it('should return correct words URL', () => {
        expect(getWordsUrl()).toBe('/word');
      });

      it('should return correct stats URL', () => {
        expect(getStatsUrl()).toBe('/stats');
      });
    });

    describe('Browsing URLs', () => {
      it('should return correct words length URL', () => {
        expect(getWordsLengthUrl()).toBe('/browse/length');
      });

      it('should return correct words letter URL', () => {
        expect(getWordsLetterUrl()).toBe('/browse/letter');
      });

      it('should return browse root when no year specified', () => {
        expect(getWordsYearUrl()).toBe('/browse');
      });

      it('should return year URL when year specified', () => {
        expect(getWordsYearUrl('2024')).toBe('/browse/2024');
      });
    });

    describe('Specific URLs', () => {
      it('should return correct length URL', () => {
        expect(getLengthUrl(5)).toBe('/browse/length/5');
        expect(getLengthUrl(12)).toBe('/browse/length/12');
      });

      it('should return correct letter URL with normalization', () => {
        expect(getLetterUrl('A')).toBe('/browse/letter/a');
        expect(getLetterUrl('z')).toBe('/browse/letter/z');
        expect(getLetterUrl('M')).toBe('/browse/letter/m');
      });

      it('should return correct month URL with normalization', () => {
        expect(getMonthUrl('2024', 'January')).toBe('/browse/2024/january');
        expect(getMonthUrl('2023', 'DECEMBER')).toBe('/browse/2023/december');
        expect(getMonthUrl('2025', 'march')).toBe('/browse/2025/march');
      });

      it('should return correct stat URL', () => {
        expect(getStatUrl('longest-words')).toBe('/stats/longest-words');
        expect(getStatUrl('alphabetical-order')).toBe('/stats/alphabetical-order');
      });
    });
  });

  describe('getBasePath', () => {
    it('returns "/" when BASE_PATH is not set', () => {
      mockEnv.BASE_PATH = undefined;
      expect(getBasePath()).toBe('/');
    });

    it('returns the BASE_PATH when set', () => {
      mockEnv.BASE_PATH = '/blog';
      expect(getBasePath()).toBe('/blog');
    });

    it('returns the BASE_PATH with trailing slash', () => {
      mockEnv.BASE_PATH = '/occasional-wotd/';
      expect(getBasePath()).toBe('/occasional-wotd/');
    });

    it('handles empty string BASE_PATH', () => {
      mockEnv.BASE_PATH = '';
      expect(getBasePath()).toBe('/');
    });
  });

  describe('getPathname', () => {
    describe('without BASE_PATH', () => {
      beforeEach(() => {
        mockEnv.BASE_PATH = '/';
      });

      it('returns pathname as-is', () => {
        expect(getPathname('/words/browse')).toBe('/words/browse');
        expect(getPathname('/stats')).toBe('/stats');
        expect(getPathname('/')).toBe('/');
      });

      it('handles empty pathname', () => {
        expect(getPathname('')).toBe('');
      });
    });

    describe('with BASE_PATH=/occasional-wotd', () => {
      beforeEach(() => {
        mockEnv.BASE_PATH = '/occasional-wotd';
      });

      it('strips base path from pathname', () => {
        expect(getPathname('/occasional-wotd/words/browse')).toBe('/words/browse');
        expect(getPathname('/occasional-wotd/stats')).toBe('/stats');
        expect(getPathname('/occasional-wotd/')).toBe('/');
        expect(getPathname('/occasional-wotd')).toBe('/');
      });

      it('returns pathname unchanged if no base path present', () => {
        expect(getPathname('/other/path')).toBe('/other/path');
        expect(getPathname('/words/browse')).toBe('/words/browse');
      });

      it('handles edge cases', () => {
        expect(getPathname('')).toBe('');
        expect(getPathname('/')).toBe('/');
      });
    });

    describe('with BASE_PATH=/blog/', () => {
      beforeEach(() => {
        mockEnv.BASE_PATH = '/blog/';
      });

      it('strips base path with trailing slash', () => {
        expect(getPathname('/blog/words')).toBe('/words');
        expect(getPathname('/blog/')).toBe('/');
        expect(getPathname('/blog')).toBe('/');
      });
    });
  });

  describe('stripBasePath', () => {
    describe('without BASE_PATH', () => {
      beforeEach(() => {
        mockEnv.BASE_PATH = '/';
      });

      it('returns web standard paths with leading slashes', () => {
        expect(stripBasePath('/words/browse')).toBe('/words/browse');
        expect(stripBasePath('/stats')).toBe('/stats');
        expect(stripBasePath('/')).toBe('/');
      });
    });

    describe('with BASE_PATH=/occasional-wotd', () => {
      beforeEach(() => {
        mockEnv.BASE_PATH = '/occasional-wotd';
      });

      it('strips base path but keeps leading slashes', () => {
        expect(stripBasePath('/occasional-wotd/words/browse')).toBe('/words/browse');
        expect(stripBasePath('/occasional-wotd/stats')).toBe('/stats');
        expect(stripBasePath('/occasional-wotd/')).toBe('/');
        expect(stripBasePath('/occasional-wotd')).toBe('/');
      });

      it('handles paths without base path', () => {
        expect(stripBasePath('/other/path')).toBe('/other/path');
        expect(stripBasePath('/words')).toBe('/words');
      });

      it('returns root slash for root paths', () => {
        expect(stripBasePath('/')).toBe('/');
        expect(stripBasePath('')).toBe('/');
      });
    });
  });
});
