import { afterEach, describe, expect, it } from 'vitest';
import { getSocialImageUrl } from '#astro-utils/image-utils';

describe('image-utils', () => {
  describe('getSocialImageUrl', () => {
    afterEach(() => {
      mockEnv.SOURCE_DIR = '';
    });

    it('links a word page to its word card', () => {
      const url = getSocialImageUrl({
        pathname: '/word/test',
        wordData: { word: 'test', date: '20240115', adapter: 'manual', data: [] },
      });

      expect(url).toBe('https://test.com/images/social/2024/20240115-test.png');
    });

    it('reads SOURCE_DIR from the env schema and puts it before images', () => {
      mockEnv.SOURCE_DIR = 'custom';

      const url = getSocialImageUrl({
        pathname: '/word/test',
        wordData: { word: 'test', date: '20240115', adapter: 'manual', data: [] },
      });

      expect(url).toBe('https://test.com/custom/images/social/2024/20240115-test.png');
    });

    it('links a page without word data to its page card', () => {
      // Astro.url.pathname ends a page in a slash; the card is named for the route
      expect(getSocialImageUrl({ pathname: '/browse/2023/april/' }))
        .toBe('https://test.com/images/social/pages/browse-2023-april.png');
      expect(getSocialImageUrl({ pathname: '/stats/', wordData: null }))
        .toBe('https://test.com/images/social/pages/stats.png');
    });

    it('encodes the space and keeps the ampersand of a word as written', () => {
      expect(getSocialImageUrl({
        pathname: '/word/ice-cream',
        wordData: { word: 'ice cream', date: '20240615', adapter: 'manual', data: [] },
      }))
        .toBe('https://test.com/images/social/2024/20240615-ice%20cream.png');
      expect(getSocialImageUrl({
        pathname: '/word/pbj',
        wordData: { word: 'pb&j', date: '20230102', adapter: 'manual', data: [] },
      }))
        .toBe('https://test.com/images/social/2023/20230102-pb&j.png');
    });

    it('names the page card without BASE_PATH and links it under BASE_PATH once', () => {
      mockEnv.BASE_PATH = '/blog';

      const url = getSocialImageUrl({ pathname: '/blog/browse/2023/april/' });

      expect(url).toBe('https://test.com/blog/images/social/pages/browse-2023-april.png');
    });
  });
});
