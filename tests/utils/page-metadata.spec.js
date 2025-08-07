import { beforeEach, describe, expect, it } from 'vitest';

import { getAllPageMetadata, getPageMetadata } from '~utils-client/page-metadata';

// Mock Astro global
beforeEach(() => {
  global.Astro = {
    url: {
      pathname: '/',
    },
  };
});

describe('page-metadata', () => {
  describe('getPageMetadata', () => {
    it('returns metadata for static pages', () => {
      const metadata = getPageMetadata('words');
      expect(metadata).toEqual({
        type: 'static',
        title: 'All Words',
        description: 'Browse the complete alphabetical list of all featured words, organized by year.',
        category: 'pages',
      });
    });

    it('returns dynamic metadata for stats pages with counts', () => {
      const metadata = getPageMetadata('stats/words-ending-ly');
      expect(metadata.title).toBe('-ly words');
      expect(metadata.category).toBe('stats');
      expect(metadata.description).toContain('words that end with the suffix');
    });

    it('returns metadata for dynamic year pages', () => {
      const metadata = getPageMetadata('words/2024');
      expect(metadata).toEqual({
        title: '2024 words',
        description: 'Words featured during 2024.',
        category: 'pages',
      });
    });

    it('returns metadata for dynamic month pages', () => {
      const metadata = getPageMetadata('words/2024/december');
      expect(metadata).toEqual({
        title: 'December 2024 words',
        description: 'Words featured during December 2024.',
        category: 'pages',
      });
    });

    it('returns metadata for length index page', () => {
      const metadata = getPageMetadata('words/length');
      expect(metadata).toEqual({
        title: 'Words by Length',
        description: 'Browse words grouped by length.',
        category: 'pages',
      });
    });

    it('returns metadata for dynamic length pages', () => {
      const metadata = getPageMetadata('words/length/4');
      expect(metadata).toEqual({
        title: '4-letter words',
        description: 'Words that are 4 letters long.',
        category: 'pages',
      });
    });

    it('returns fallback metadata for unknown paths', () => {
      const metadata = getPageMetadata('unknown-path');
      expect(metadata).toEqual({
        title: 'Unknown Page',
        description: '',
        category: 'unknown',
      });
    });

    it('throws error for undefined pathname', () => {
      expect(() => getPageMetadata()).toThrow('getPageMetadata: pathname is required');
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

    it('includes month and length pages', () => {
      const allPages = getAllPageMetadata();
      expect(allPages.find(page => page.path === 'words/2025/january')).toBeDefined();
      expect(allPages.find(page => page.path === 'words/length')).toBeDefined();
      expect(allPages.find(page => page.path === 'words/length/4')).toBeDefined();
    });
  });
});
