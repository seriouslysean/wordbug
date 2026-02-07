import { describe, expect, it, vi } from 'vitest';

vi.mock('#astro-utils/page-metadata', () => ({
  getAllPageMetadata: vi.fn(() => [
    { pathname: '/', title: 'Home' },
    { pathname: '/words', title: 'Words' },
    { pathname: '/stats', title: 'Stats' },
  ]),
}));

import { getSocialImageUrl, getStaticPages } from '#astro-utils/image-utils';

describe('image-utils', () => {
  describe('getSocialImageUrl', () => {
    it('returns word-specific image URL when word data is provided', () => {
      const wordData = {
        word: 'test',
        date: '20240115',
      };

      const url = getSocialImageUrl({ pathname: '/word/test', wordData });

      expect(url).toContain('/images/social/');
      expect(url).toContain('/2024/');
      expect(url).toContain('20240115-test.png');
    });

    it('includes source directory in path when SOURCE_DIR is set', () => {
      vi.stubEnv('SOURCE_DIR', 'custom');

      const wordData = {
        word: 'test',
        date: '20240115',
      };

      const url = getSocialImageUrl({ pathname: '/word/test', wordData });

      expect(url).toContain('/images/social/custom/2024/20240115-test.png');

      vi.unstubAllEnvs();
    });

    it('returns generic page image URL when no word data is provided', () => {
      const url = getSocialImageUrl({ pathname: '/stats' });

      expect(url).toContain('/images/social/pages/stats.png');
    });

    it('returns index image for empty pathname', () => {
      const url = getSocialImageUrl({ pathname: '/' });

      expect(url).toContain('/images/social/pages/index.png');
    });

    it('handles pathname without leading slash', () => {
      const url = getSocialImageUrl({ pathname: 'stats' });

      expect(url).toContain('/images/social/pages/stats.png');
    });

    it('handles null word data', () => {
      vi.stubEnv('BASE_PATH', '/');

      const url = getSocialImageUrl({ pathname: '/stats', wordData: null });

      expect(url).toContain('/images/social/pages/stats.png');

      vi.unstubAllEnvs();
    });
  });

  describe('getStaticPages', () => {
    it('returns array of page metadata', async () => {
      const pages = await getStaticPages();

      expect(Array.isArray(pages)).toBe(true);
      expect(pages.length).toBeGreaterThan(0);
    });

    it('includes expected page properties', async () => {
      const pages = await getStaticPages();

      pages.forEach(page => {
        expect(page).toHaveProperty('pathname');
        expect(page).toHaveProperty('title');
      });
    });
  });
});
