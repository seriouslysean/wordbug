import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getBasePath, 
  getPathname, 
  getUrl, 
  getFullUrl, 
  stripBasePath 
} from '~astro-utils/url-utils';

describe('URL Utilities - Comprehensive Tests', () => {
  beforeEach(() => {
    // Reset environment variables
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

  describe('getUrl', () => {
    describe('without BASE_PATH', () => {
      beforeEach(() => {
        vi.stubGlobal('__BASE_URL__', '/');
      });

      it('returns path unchanged', () => {
        expect(getUrl('/words')).toBe('/words');
        expect(getUrl('/words/browse')).toBe('/words/browse');
        expect(getUrl('/')).toBe('/');
      });
    });

    describe('with BASE_PATH=/occasional-wotd', () => {
      beforeEach(() => {
        vi.stubGlobal('__BASE_URL__', '/occasional-wotd');
      });

      it('adds base path to clean paths', () => {
        expect(getUrl('/words')).toBe('/occasional-wotd/words');
        expect(getUrl('/words/browse')).toBe('/occasional-wotd/words/browse');
        expect(getUrl('/stats')).toBe('/occasional-wotd/stats');
        expect(getUrl('/')).toBe('/occasional-wotd');
      });

      it('does not double-add base path', () => {
        expect(getUrl('/occasional-wotd/words')).toBe('/occasional-wotd/words');
        expect(getUrl('/occasional-wotd/words/browse')).toBe('/occasional-wotd/words/browse');
      });

      it('handles paths without leading slash', () => {
        expect(getUrl('words')).toBe('/occasional-wotd/words');
        expect(getUrl('stats')).toBe('/occasional-wotd/stats');
      });

    });

    describe('with BASE_PATH=/blog/', () => {
      beforeEach(() => {
        vi.stubGlobal('__BASE_URL__', '/blog/');
      });

      it('handles base path with trailing slash', () => {
        expect(getUrl('/words')).toBe('/blog/words');
        expect(getUrl('/')).toBe('/blog/');
      });
    });
  });

  describe('getFullUrl', () => {
    beforeEach(() => {
      vi.stubGlobal('__SITE_URL__', 'https://example.com');
    });

    describe('without BASE_PATH', () => {
      beforeEach(() => {
        vi.stubGlobal('__BASE_URL__', '/');
      });

      it('constructs full URLs correctly', () => {
        expect(getFullUrl('/words')).toBe('https://example.com/words');
        expect(getFullUrl('/words/browse')).toBe('https://example.com/words/browse');
        expect(getFullUrl('/')).toBe('https://example.com/');
      });
    });

    describe('with BASE_PATH=/occasional-wotd', () => {
      beforeEach(() => {
        vi.stubGlobal('__BASE_URL__', '/occasional-wotd');
      });

      it('constructs full URLs with base path', () => {
        expect(getFullUrl('/words')).toBe('https://example.com/occasional-wotd/words');
        expect(getFullUrl('/words/browse')).toBe('https://example.com/occasional-wotd/words/browse');
        expect(getFullUrl('/')).toBe('https://example.com/occasional-wotd');
      });

      it('handles paths that already include base path', () => {
        expect(getFullUrl('/occasional-wotd/words')).toBe('https://example.com/occasional-wotd/words');
        expect(getFullUrl('/occasional-wotd/words/browse')).toBe('https://example.com/occasional-wotd/words/browse');
      });
    });

    describe('with SITE_URL having trailing slash', () => {
      beforeEach(() => {
        vi.stubGlobal('__SITE_URL__', 'https://example.com/');
        vi.stubGlobal('__BASE_URL__', '/');
      });

      it('handles SITE_URL with trailing slash correctly', () => {
        expect(getFullUrl('/words')).toBe('https://example.com/words');
        expect(getFullUrl('/')).toBe('https://example.com/');
      });
    });

    it('throws error when SITE_URL is missing', () => {
      vi.stubGlobal('__SITE_URL__', '');
      expect(() => getFullUrl('/words')).toThrow('SITE_URL environment variable is required');
    });

    it('throws error when SITE_URL is undefined', () => {
      vi.stubGlobal('__SITE_URL__', undefined);
      expect(() => getFullUrl('/words')).toThrow('SITE_URL environment variable is required');
    });
  });

  describe('stripBasePath', () => {
    describe('without BASE_PATH', () => {
      beforeEach(() => {
        vi.stubGlobal('__BASE_URL__', '/');
      });

      it('strips leading slash only', () => {
        expect(stripBasePath('/words/browse')).toBe('words/browse');
        expect(stripBasePath('/stats')).toBe('stats');
        expect(stripBasePath('/')).toBe('');
      });
    });

    describe('with BASE_PATH=/occasional-wotd', () => {
      beforeEach(() => {
        vi.stubGlobal('__BASE_URL__', '/occasional-wotd');
      });

      it('strips base path and slashes', () => {
        expect(stripBasePath('/occasional-wotd/words/browse')).toBe('words/browse');
        expect(stripBasePath('/occasional-wotd/stats')).toBe('stats');
        expect(stripBasePath('/occasional-wotd/')).toBe('');
        expect(stripBasePath('/occasional-wotd')).toBe('');
      });

      it('handles paths without base path', () => {
        expect(stripBasePath('/other/path')).toBe('other/path');
        expect(stripBasePath('/words')).toBe('words');
      });

      it('returns empty string for root paths', () => {
        expect(stripBasePath('/')).toBe('');
        expect(stripBasePath('')).toBe('');
      });
    });
  });

  describe('Real-world scenarios', () => {
    describe('Astro.url.pathname usage patterns', () => {
      beforeEach(() => {
        vi.stubGlobal('__BASE_URL__', '/occasional-wotd');
        vi.stubGlobal('__SITE_URL__', 'https://example.com');
      });

      it('handles common Astro pathname patterns', () => {
        // Simulate Astro.url.pathname that includes base path
        const astroPathname = '/occasional-wotd/words/browse';
        
        // Get clean pathname for page metadata lookup
        expect(getPathname(astroPathname)).toBe('/words/browse');
        expect(stripBasePath(astroPathname)).toBe('words/browse');
        
        // Get full URL for canonical links
        expect(getFullUrl(astroPathname)).toBe('https://example.com/occasional-wotd/words/browse');
      });

      it('handles root page correctly', () => {
        const astroPathname = '/occasional-wotd/';
        
        expect(getPathname(astroPathname)).toBe('/');
        expect(stripBasePath(astroPathname)).toBe('');
        expect(getFullUrl(astroPathname)).toBe('https://example.com/occasional-wotd/');
      });
    });

    describe('SiteLink component usage patterns', () => {
      beforeEach(() => {
        vi.stubGlobal('__BASE_URL__', '/occasional-wotd');
      });

      it('handles href passed to SiteLink', () => {
        // Simulate SiteLink receiving href="/words" 
        const href = '/words';
        
        // SiteLink calls getUrl to add base path
        expect(getUrl(href)).toBe('/occasional-wotd/words');
      });

      it('handles href that already has base path', () => {
        // Edge case: href already includes base path
        const href = '/occasional-wotd/words';
        
        // Should not double-add base path
        expect(getUrl(href)).toBe('/occasional-wotd/words');
      });
    });
  });
});