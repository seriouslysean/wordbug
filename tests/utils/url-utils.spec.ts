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
import { isPathUnderBase, withoutTrailingSlash, withTrailingSlash } from '#utils/url-utils';

declare const mockEnv: Record<string, string | boolean | undefined>;

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
      expect(getUrl('/20240319')).toBe('/20240319/');
    });

    it('handles paths with custom base path', () => {
      mockEnv.BASE_PATH = '/blog';
      expect(getUrl('/20240319')).toBe('/blog/20240319/');
    });

    it('handles paths with custom base path with trailing slash', () => {
      mockEnv.BASE_PATH = '/blog/';
      expect(getUrl('/20240319')).toBe('/blog/20240319/');
    });

    it('prefixes a path that merely shares its first characters with the base path', () => {
      mockEnv.BASE_PATH = '/app';
      expect(getUrl('/apple')).toBe('/app/apple/');
      expect(getUrl('/app/x')).toBe('/app/x/');
    });

    it('names the site root under a base path with its trailing slash', () => {
      // A static host serves a directory at /blog/ and redirects /blog to it
      mockEnv.BASE_PATH = '/blog';
      expect(getUrl('/')).toBe('/blog/');
      expect(getUrl()).toBe('/blog/');
      // The base path itself names the root, with or without its slash
      expect(getUrl('/blog')).toBe('/blog/');
      expect(getUrl('/blog/')).toBe('/blog/');

      mockEnv.BASE_PATH = '/blog/';
      expect(getUrl('/')).toBe('/blog/');
      expect(getUrl('/blog')).toBe('/blog/');

      // A dot in the base path does not make the root a file
      mockEnv.BASE_PATH = '/my.site';
      expect(getUrl('/')).toBe('/my.site/');
      expect(getUrl('/my.site')).toBe('/my.site/');
      expect(getUrl('/stats')).toBe('/my.site/stats/');
    });

    it('handles empty or undefined base path', () => {
      mockEnv.BASE_PATH = '';
      expect(getUrl('/20240319')).toBe('/20240319/');
    });

    it('handles empty paths', () => {
      expect(getUrl('/')).toBe('/');
      expect(getUrl('')).toBe('/');
    });

    it('ends a page URL in one slash, whichever form asks', () => {
      // Astro.url.pathname already ends in a slash; a route does not
      expect(getUrl('/stats')).toBe('/stats/');
      expect(getUrl('/stats/')).toBe('/stats/');

      mockEnv.BASE_PATH = '/blog';
      expect(getUrl('/stats')).toBe('/blog/stats/');
      expect(getUrl('/blog/stats')).toBe('/blog/stats/');
      expect(getUrl('/blog/stats/')).toBe('/blog/stats/');
    });

    it('leaves a file URL without a trailing slash', () => {
      expect(getUrl('/rss.xml')).toBe('/rss.xml');
      expect(getUrl('/favicon.svg')).toBe('/favicon.svg');

      mockEnv.BASE_PATH = '/blog';
      expect(getUrl('/words.json')).toBe('/blog/words.json');
      expect(getUrl('/sitemap-index.xml')).toBe('/blog/sitemap-index.xml');
      expect(getUrl('/demo/images/social/pages/stats.png')).toBe('/blog/demo/images/social/pages/stats.png');
    });

    it('ignores SITE_URL when building relative URLs', () => {
      mockEnv.BASE_PATH = '/blog';
      mockEnv.SITE_URL = 'https://example.com';
      expect(getUrl('/words/hello')).toBe('/blog/words/hello/');
    });

    it('preserves case for base path and path', () => {
      mockEnv.BASE_PATH = '/Blog';
      expect(getUrl('/ABC')).toBe('/Blog/ABC/');
    });
  });

  describe('getFullUrl', () => {
    beforeEach(() => {
      mockEnv.BASE_PATH = '/';
      mockEnv.SITE_URL = 'https://example.com';
    });

    it('combines SITE_URL with getUrl() result', () => {
      expect(getFullUrl('/words/hello')).toBe('https://example.com/words/hello/');
    });

    it('handles subdirectory deployments correctly', () => {
      mockEnv.BASE_PATH = '/vocab';
      expect(getFullUrl('/words/hello')).toBe('https://example.com/vocab/words/hello/');
    });

    it('names a file without a trailing slash', () => {
      mockEnv.BASE_PATH = '/vocab';
      expect(getFullUrl('/rss.xml')).toBe('https://example.com/vocab/rss.xml');
      expect(getFullUrl('/images/social/2024/20240615-ice%20cream.png'))
        .toBe('https://example.com/vocab/images/social/2024/20240615-ice%20cream.png');
    });

    it('handles root path correctly', () => {
      expect(getFullUrl('/')).toBe('https://example.com/');
    });

    it('gives the home page one URL under a base path, whichever form asks', () => {
      mockEnv.BASE_PATH = '/vocab';
      expect(getFullUrl('/')).toBe('https://example.com/vocab/');
      expect(getFullUrl('/vocab')).toBe('https://example.com/vocab/');
      expect(getFullUrl('/vocab/')).toBe('https://example.com/vocab/');
    });

    it('does not double a base path that SITE_URL repeats', () => {
      mockEnv.BASE_PATH = '/vocab';
      mockEnv.SITE_URL = 'https://example.com/vocab';
      expect(getFullUrl('/')).toBe('https://example.com/vocab/');
      expect(getFullUrl('/words/hello')).toBe('https://example.com/vocab/words/hello/');
    });

    it('throws when SITE_URL is missing', () => {
      mockEnv.SITE_URL = '';
      expect(() => getFullUrl('/test')).toThrow('SITE_URL environment variable is required');
    });

    it('removes trailing slash from SITE_URL', () => {
      mockEnv.SITE_URL = 'https://example.com/';
      expect(getFullUrl('/test')).toBe('https://example.com/test/');
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

  describe('isPathUnderBase', () => {
    it('matches the base itself and anything below it', () => {
      expect(isPathUnderBase('/app', '/app')).toBe(true);
      expect(isPathUnderBase('/app/x', '/app')).toBe(true);
      expect(isPathUnderBase('/app/', '/app')).toBe(true);
    });

    it('requires a segment boundary after the base', () => {
      expect(isPathUnderBase('/apple', '/app')).toBe(false);
      expect(isPathUnderBase('/other/app/x', '/app')).toBe(false);
    });

    it('treats regex metacharacters in the base literally', () => {
      expect(isPathUnderBase('/a.b/x', '/a.b')).toBe(true);
      expect(isPathUnderBase('/axb/x', '/a.b')).toBe(false);
    });
  });

  describe('withTrailingSlash', () => {
    it('ends a page path in a slash', () => {
      expect(withTrailingSlash('/stats')).toBe('/stats/');
      expect(withTrailingSlash('/browse/2024/january')).toBe('/browse/2024/january/');
      expect(withTrailingSlash('/word/ice-cream')).toBe('/word/ice-cream/');
    });

    it('leaves a path that already ends in a slash', () => {
      expect(withTrailingSlash('/')).toBe('/');
      expect(withTrailingSlash('/stats/')).toBe('/stats/');
    });

    it('leaves a path whose last segment has an extension: it names a file', () => {
      expect(withTrailingSlash('/rss.xml')).toBe('/rss.xml');
      expect(withTrailingSlash('/robots.txt')).toBe('/robots.txt');
      expect(withTrailingSlash('/ga-init.js')).toBe('/ga-init.js');
      expect(withTrailingSlash('/images/social/2024/20240615-ice%20cream.png'))
        .toBe('/images/social/2024/20240615-ice%20cream.png');
    });

    it('reads a dot in an earlier segment as part of a page path', () => {
      expect(withTrailingSlash('/a.b/stats')).toBe('/a.b/stats/');
    });
  });

  describe('withoutTrailingSlash', () => {
    it('drops the slash Astro.url.pathname ends a page in', () => {
      expect(withoutTrailingSlash('/stats/')).toBe('/stats');
      expect(withoutTrailingSlash('/browse/2024/january/')).toBe('/browse/2024/january');
    });

    it('keeps the root and a path with no trailing slash', () => {
      expect(withoutTrailingSlash('/')).toBe('/');
      expect(withoutTrailingSlash('/stats')).toBe('/stats');
      expect(withoutTrailingSlash('')).toBe('');
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

      it('returns a route as-is', () => {
        expect(getPathname('/words/browse')).toBe('/words/browse');
        expect(getPathname('/stats')).toBe('/stats');
        expect(getPathname('/')).toBe('/');
      });

      it('drops the trailing slash of a page pathname', () => {
        expect(getPathname('/stats/')).toBe('/stats');
        expect(getPathname('/browse/2024/january/')).toBe('/browse/2024/january');
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

      it('drops the trailing slash of a page pathname', () => {
        expect(getPathname('/occasional-wotd/stats/')).toBe('/stats');
        expect(getPathname('/occasional-wotd/word/hello/')).toBe('/word/hello');
        expect(getPathname('/other/path/')).toBe('/other/path');
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

    describe('with BASE_PATH=/app', () => {
      beforeEach(() => {
        mockEnv.BASE_PATH = '/app';
      });

      it('leaves a sibling path that merely shares the prefix untouched', () => {
        expect(getPathname('/apple')).toBe('/apple');
        expect(getPathname('/apple/pie')).toBe('/apple/pie');
        expect(getPathname('/app')).toBe('/');
        expect(getPathname('/app/x')).toBe('/x');
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
        expect(stripBasePath('/occasional-wotd/stats/')).toBe('/stats');
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
