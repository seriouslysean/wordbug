import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUrl } from '~utils/utils';

describe('utils', () => {
  describe('getUrl', () => {
    beforeEach(() => {
      // Set up the default base URL
      vi.stubEnv('BASE_URL', '/');
    });

    it('handles paths with default base URL', () => {
      expect(getUrl('/20240319')).toBe('/20240319');
    });

    it('handles paths with custom base URL', () => {
      vi.stubEnv('BASE_URL', '/blog');
      expect(getUrl('/20240319')).toBe('/blog/20240319');
    });

    it('handles paths with custom base URL with trailing slash', () => {
      vi.stubEnv('BASE_URL', '/blog/');
      expect(getUrl('/20240319')).toBe('/blog/20240319');
    });

    it('handles empty or undefined base URL', () => {
      vi.stubEnv('BASE_URL', '');
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

    it('preserves trailing slashes in valid paths', () => {
      expect(getUrl('/20240319/')).toBe('/20240319/');
    });
  });
});
