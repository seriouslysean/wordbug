import { describe, expect, it } from 'vitest';

import { getAllPageMetadata, getPageMetadata } from '~utils/page-metadata';

describe('page-metadata', () => {
  describe('getPageMetadata', () => {
    it('returns metadata for static pages', () => {
      const metadata = getPageMetadata('words');
      expect(metadata).toEqual({
        title: 'All Words',
        description: 'Complete alphabetical list of all featured words',
        category: 'pages',
      });
    });

    it('returns dynamic metadata for stats pages with counts', () => {
      const metadata = getPageMetadata('stats/words-ending-ly');
      expect(metadata.title).toBe('-ly words');
      expect(metadata.category).toBe('stats');
      expect(metadata.description).toMatch(/^\d+ words? that end with the suffix "-ly"\.$/);
    });

    it('returns metadata for dynamic year pages', () => {
      const metadata = getPageMetadata('words/2024');
      expect(metadata).toEqual({
        title: '2024 Words',
        description: 'Words featured during 2024.',
        category: 'pages',
      });
    });

    it('returns empty object for unknown paths', () => {
      const metadata = getPageMetadata('unknown-path');
      expect(metadata).toEqual({});
    });

    it('handles undefined pathname by using empty string fallback', () => {
      const metadata = getPageMetadata();
      expect(metadata).toEqual({
        title: null,
        description: null,
        category: 'root',
      });
    });
  });

  describe('getAllPageMetadata', () => {
    it('returns all static and dynamic pages', () => {
      const allPages = getAllPageMetadata();

      expect(Array.isArray(allPages)).toBe(true);
      expect(allPages.length).toBeGreaterThan(0);

      // Should include static pages
      const wordsPage = allPages.find(page => page.path === 'words');
      expect(wordsPage).toBeDefined();
      expect(wordsPage.title).toBe('All Words');
    });

    it('excludes root path from results', () => {
      const allPages = getAllPageMetadata();
      const rootPage = allPages.find(page => page.path === '');
      expect(rootPage).toBeUndefined();
    });

    it('ensures all pages have required properties', () => {
      const allPages = getAllPageMetadata();

      allPages.forEach(page => {
        expect(page).toHaveProperty('path');
        expect(page).toHaveProperty('title');
        expect(page).toHaveProperty('description');
        expect(page).toHaveProperty('category');
        expect(['pages', 'stats'].includes(page.category)).toBe(true);
      });
    });
  });
});