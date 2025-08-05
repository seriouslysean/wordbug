import {
 beforeEach, describe, expect, it, vi,
} from 'vitest';

import { getFullUrl, getUrl } from '~utils-client/url-utils';

describe('utils', () => {
  describe('getUrl', () => {
    beforeEach(() => {
      vi.stubEnv('BASE_PATH', '/');
    });

    it('handles paths with default base path', () => {
      expect(getUrl('/20240319')).toBe('/20240319');
    });

    it('handles paths with custom base path', () => {
      vi.stubEnv('BASE_PATH', '/blog');
      expect(getUrl('/20240319')).toBe('/blog/20240319');
    });

    it('handles paths with custom base path with trailing slash', () => {
      vi.stubEnv('BASE_PATH', '/blog/');
      expect(getUrl('/20240319')).toBe('/blog/20240319');
    });

    it('handles empty or undefined base path', () => {
      vi.stubEnv('BASE_PATH', '');
      expect(getUrl('/20240319')).toBe('/20240319');
    });

    it('handles empty paths', () => {
      expect(getUrl('')).toBe('/');
      expect(getUrl('/')).toBe('/');
    });

    it('handles null or undefined paths', () => {
      expect(getUrl(null)).toBe('/');
      expect(getUrl(undefined)).toBe('/');
    });

    it('rejects paths with multiple consecutive slashes', () => {
      expect(() => getUrl('//20240319')).toThrow('Invalid path: contains multiple consecutive slashes');
      expect(() => getUrl('///20240319')).toThrow('Invalid path: contains multiple consecutive slashes');
    });

    it('preserves trailing slashes for root path only', () => {
      expect(getUrl('/')).toBe('/');
      expect(getUrl('/20240319/')).toBe('/20240319');
    });

    it('ignores SITE_URL when building relative URLs', () => {
      vi.stubEnv('BASE_PATH', '/blog');
      vi.stubEnv('SITE_URL', 'https://example.com');
      expect(getUrl('/words/hello')).toBe('/blog/words/hello');
    });

    it('preserves case for base path and path', () => {
      vi.stubEnv('BASE_PATH', '/Blog');
      expect(getUrl('/ABC')).toBe('/Blog/ABC');
    });
  });

  describe('getFullUrl', () => {
    beforeEach(() => {
      vi.stubEnv('BASE_PATH', '/');
      vi.stubEnv('SITE_URL', 'https://example.com');
    });

    it('combines SITE_URL with getUrl() result', () => {
      expect(getFullUrl('/words/hello')).toBe('https://example.com/words/hello');
    });

    it('handles subdirectory deployments correctly', () => {
      vi.stubEnv('BASE_PATH', '/vocab');
      expect(getFullUrl('/words/hello')).toBe('https://example.com/vocab/words/hello');
    });

    it('handles root path correctly', () => {
      expect(getFullUrl('/')).toBe('https://example.com/');
    });

    it('throws when SITE_URL is missing', () => {
      vi.stubEnv('SITE_URL', '');
      expect(() => getFullUrl('/test')).toThrow('SITE_URL environment variable is required');
    });

    it('removes trailing slash from SITE_URL', () => {
      vi.stubEnv('SITE_URL', 'https://example.com/');
      expect(getFullUrl('/test')).toBe('https://example.com/test');
    });

    it('uses default site URL when none provided', () => {
      vi.stubEnv('SITE_URL', '');
      expect(() => getFullUrl('/')).toThrow('SITE_URL environment variable is required');
    });
  });
});
