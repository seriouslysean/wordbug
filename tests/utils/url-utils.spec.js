import {
 beforeEach, describe, expect, it, vi,
} from 'vitest';

import {
  getBasePath,
  getPathname,
  getFullUrl,
  getUrl,
  stripBasePath,
  getWordsUrl,
  getStatsUrl,
  getWordsLengthUrl,
  getWordsLetterUrl,
  getWordsYearUrl,
  getLengthUrl,
  getLetterUrl,
  getMonthUrl,
  getStatUrl,
} from '~astro-utils/url-utils';

describe('utils', () => {
  describe('getUrl', () => {
    beforeEach(() => {
      vi.stubGlobal('__BASE_URL__', '/');
    });

    it('handles paths with default base path', () => {
      expect(getUrl('/20240319')).toBe('/20240319');
    });

    it('handles paths with custom base path', () => {
      vi.stubGlobal('__BASE_URL__', '/blog');
      expect(getUrl('/20240319')).toBe('/blog/20240319');
    });

    it('handles paths with custom base path with trailing slash', () => {
      vi.stubGlobal('__BASE_URL__', '/blog/');
      expect(getUrl('/20240319')).toBe('/blog/20240319');
    });

    it('handles empty or undefined base path', () => {
      vi.stubGlobal('__BASE_URL__', '');
      expect(getUrl('/20240319')).toBe('/20240319');
    });

    it('handles empty paths', () => {
      expect(getUrl('/')).toBe('/');
    });

    it('preserves trailing slashes for root path only', () => {
      expect(getUrl('/')).toBe('/');
    });

    it('ignores SITE_URL when building relative URLs', () => {
      vi.stubGlobal('__BASE_URL__', '/blog');
      vi.stubGlobal('__SITE_URL__', 'https://example.com');
      expect(getUrl('/words/hello')).toBe('/blog/words/hello');
    });

    it('preserves case for base path and path', () => {
      vi.stubGlobal('__BASE_URL__', '/Blog');
      expect(getUrl('/ABC')).toBe('/Blog/ABC');
    });
  });

  describe('getFullUrl', () => {
    beforeEach(() => {
      vi.stubGlobal('__BASE_URL__', '/');
      vi.stubGlobal('__SITE_URL__', 'https://example.com');
    });

    it('combines SITE_URL with getUrl() result', () => {
      expect(getFullUrl('/words/hello')).toBe('https://example.com/words/hello');
    });

    it('handles subdirectory deployments correctly', () => {
      vi.stubGlobal('__BASE_URL__', '/vocab');
      expect(getFullUrl('/words/hello')).toBe('https://example.com/vocab/words/hello');
    });

    it('handles root path correctly', () => {
      expect(getFullUrl('/')).toBe('https://example.com/');
    });

    it('throws when SITE_URL is missing', () => {
      vi.stubGlobal('__SITE_URL__', '');
      expect(() => getFullUrl('/test')).toThrow('SITE_URL environment variable is required');
    });

    it('removes trailing slash from SITE_URL', () => {
      vi.stubGlobal('__SITE_URL__', 'https://example.com/');
      expect(getFullUrl('/test')).toBe('https://example.com/test');
    });

    it('uses default site URL when none provided', () => {
      vi.stubGlobal('__SITE_URL__', '');
      expect(() => getFullUrl('/')).toThrow('SITE_URL environment variable is required');
    });
  });

  describe('URL helper functions', () => {
    describe('Section URLs', () => {
      it('should return correct words URL', () => {
        expect(getWordsUrl()).toBe('/words');
      });

      it('should return correct stats URL', () => {
        expect(getStatsUrl()).toBe('/stats');
      });
    });

    describe('Browsing URLs', () => {
      it('should return correct words length URL', () => {
        expect(getWordsLengthUrl()).toBe('/words/length');
      });

      it('should return correct words letter URL', () => {
        expect(getWordsLetterUrl()).toBe('/words/letter');
      });

      it('should return words root when no year specified', () => {
        expect(getWordsYearUrl()).toBe('/words');
      });

      it('should return year URL when year specified', () => {
        expect(getWordsYearUrl('2024')).toBe('/words/2024');
      });
    });

    describe('Specific URLs', () => {
      it('should return correct length URL', () => {
        expect(getLengthUrl(5)).toBe('/words/length/5');
        expect(getLengthUrl(12)).toBe('/words/length/12');
      });

      it('should return correct letter URL with normalization', () => {
        expect(getLetterUrl('A')).toBe('/words/letter/a');
        expect(getLetterUrl('z')).toBe('/words/letter/z');
        expect(getLetterUrl('M')).toBe('/words/letter/m');
      });

      it('should return correct month URL with normalization', () => {
        expect(getMonthUrl('2024', 'January')).toBe('/words/2024/january');
        expect(getMonthUrl('2023', 'DECEMBER')).toBe('/words/2023/december');
        expect(getMonthUrl('2025', 'march')).toBe('/words/2025/march');
      });

      it('should return correct stat URL', () => {
        expect(getStatUrl('longest-words')).toBe('/stats/longest-words');
        expect(getStatUrl('alphabetical-order')).toBe('/stats/alphabetical-order');
      });
    });
  });

  describe('getBasePath', () => {
    it('returns "/" when BASE_PATH is not set', () => {
      vi.stubGlobal('__BASE_URL__', undefined);
      expect(getBasePath()).toBe('/');
    });

    it('returns the BASE_PATH when set', () => {
      vi.stubGlobal('__BASE_URL__', '/blog');
      expect(getBasePath()).toBe('/blog');
    });

    it('returns the BASE_PATH with trailing slash', () => {
      vi.stubGlobal('__BASE_URL__', '/occasional-wotd/');
      expect(getBasePath()).toBe('/occasional-wotd/');
    });

    it('handles empty string BASE_PATH', () => {
      vi.stubGlobal('__BASE_URL__', '');
      expect(getBasePath()).toBe('/');
    });
  });

  describe('getPathname', () => {
    describe('without BASE_PATH', () => {
      beforeEach(() => {
        vi.stubGlobal('__BASE_URL__', '/');
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
        vi.stubGlobal('__BASE_URL__', '/occasional-wotd');
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
        vi.stubGlobal('__BASE_URL__', '/blog/');
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
        vi.stubGlobal('__BASE_URL__', '/');
      });

      it('returns web standard paths with leading slashes', () => {
        expect(stripBasePath('/words/browse')).toBe('/words/browse');
        expect(stripBasePath('/stats')).toBe('/stats');
        expect(stripBasePath('/')).toBe('/');
      });
    });

    describe('with BASE_PATH=/occasional-wotd', () => {
      beforeEach(() => {
        vi.stubGlobal('__BASE_URL__', '/occasional-wotd');
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
