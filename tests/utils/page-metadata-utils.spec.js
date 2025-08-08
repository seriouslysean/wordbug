import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { getAllPageMetadata, getPageMetadata } from '~utils/page-metadata-utils';

// Test data
const mockWords = [
  { word: 'test', date: '20240101' },
  { word: 'example', date: '20240102' },
  { word: 'sample', date: '20240103' },
];

describe('page-metadata-utils', () => {
  describe('getPageMetadata', () => {
    it('returns metadata for static pages', () => {
      const metadata = getPageMetadata('words', mockWords);
      expect(metadata).toEqual({
        title: 'All Words',
        description: 'Explore every word in our collection, organized chronologically.',
        category: 'pages',
        secondaryText: '3 words',
      });
    });

    it('returns metadata for stats page', () => {
      const metadata = getPageMetadata('stats', mockWords);
      expect(metadata).toEqual({
        title: 'Stats',
        description: 'Explore patterns and statistics from our word collection.',
        category: 'pages',
        secondaryText: 'For Nerds',
      });
    });

    it('returns dynamic metadata for stats pages with counts', () => {
      const metadata = getPageMetadata('stats/words-ending-ly', mockWords);
      expect(metadata.title).toBe('Words Ending in "ly"');
      expect(metadata.category).toBe('stats');
      expect(metadata.description).toContain('words that end with the suffix "ly"');
    });

    it('returns metadata for dynamic year pages', () => {
      const metadata = getPageMetadata('words/2024', mockWords);
      expect(metadata).toEqual({
        title: '2024',
        description: 'Words from 2024, organized by month.',
        category: 'pages',
        secondaryText: 'Words in',
      });
    });

    it('returns metadata for dynamic month pages', () => {
      const metadata = getPageMetadata('words/2024/january', mockWords);
      expect(metadata).toEqual({
        title: 'January',
        description: 'Words from January 2024.',
        category: 'pages',
        secondaryText: '2024',
      });
    });

    it('returns metadata for length index page', () => {
      const metadata = getPageMetadata('words/length', mockWords);
      expect(metadata).toEqual({
        title: 'Words by Length',
        description: 'Words organized by character length.',
        category: 'pages',
        secondaryText: '3 words',
      });
    });

    it('returns metadata for individual length pages', () => {
      const metadata = getPageMetadata('words/length/8', mockWords);
      expect(metadata).toEqual({
        title: '8-Letter Words',
        description: 'Words containing exactly 8 letters.',
        category: 'pages',
        secondaryText: '0 words',
      });
    });

    it('returns metadata for dynamic length pages', () => {
      const metadata = getPageMetadata('words/length/4', mockWords);
      expect(metadata).toEqual({
        title: '4-Letter Words',
        description: 'Words containing exactly 4 letters.',
        category: 'pages',
        secondaryText: '1 word',
      });
    });

    it('returns metadata for 404 page', () => {
      const metadata = getPageMetadata('404', mockWords);
      expect(metadata).toEqual({
        title: '404',
        description:
          'A web page that cannot be found; an error indicating the requested content does not exist.',
        category: 'pages',
        secondaryText: undefined,
        partOfSpeech: 'noun',
      });
    });

    it('returns fallback metadata for unknown paths', () => {
      const metadata = getPageMetadata('unknown-path', mockWords);
      expect(metadata).toEqual({
        title: 'Unknown Page',
        description: '',
        category: 'unknown',
        secondaryText: undefined,
      });
    });

    it('throws error for undefined pathname', () => {
      expect(() => getPageMetadata()).toThrow('getPageMetadata: pathname is required');
    });
  });

  describe('getAllPageMetadata', () => {
    it('returns all static and dynamic pages', () => {
      const allPages = getAllPageMetadata(mockWords);

      expect(Array.isArray(allPages)).toBe(true);
      expect(allPages.length).toBeGreaterThan(0);

      // Should include static pages
      const wordsPage = allPages.find(page => page.path === 'words');
      expect(wordsPage).toBeDefined();
      expect(wordsPage.title).toBe('All Words');
    });

    it('excludes root path from results', () => {
      const allPages = getAllPageMetadata(mockWords);
      const rootPage = allPages.find(page => page.path === '');
      expect(rootPage).toBeUndefined();
    });

    it('ensures all pages have required properties', () => {
      const allPages = getAllPageMetadata(mockWords);

      allPages.forEach(page => {
        expect(page).toHaveProperty('path');
        expect(page).toHaveProperty('title');
        expect(page).toHaveProperty('description');
        expect(page).toHaveProperty('category');
        expect(page).toHaveProperty('secondaryText');
        expect(['pages', 'stats'].includes(page.category)).toBe(true);
      });
    });

    it('includes year and length pages', () => {
      const allPages = getAllPageMetadata(mockWords);
      expect(allPages.find(page => page.path === 'words/2024')).toBeDefined();
      expect(allPages.find(page => page.path === 'words/length')).toBeDefined();
      expect(allPages.find(page => page.path === 'words/length/4')).toBeDefined();
    });
  });

  describe('getPageMetadata wrapper', () => {
    it('handles BASE_PATH prefixes', async () => {
      vi.stubEnv('BASE_PATH', '/vocab');
      const { getPageMetadata: getPageMetadataWrapper } = await import(
        '~astro-utils/page-metadata'
      );
      const metadata = getPageMetadataWrapper('/vocab/stats');
      expect(metadata).toEqual({
        title: 'Stats',
        description: 'Explore patterns and statistics from our word collection.',
        category: 'pages',
        secondaryText: 'For Nerds',
      });
    });

    it('handles BASE_PATH with different case and trailing slash', async () => {
      vi.stubEnv('BASE_PATH', '/Vocab/');
      vi.resetModules();
      const { getPageMetadata: getPageMetadataWrapper } = await import(
        '~astro-utils/page-metadata'
      );
      const metadata = getPageMetadataWrapper('/vocab/stats');
      expect(metadata).toEqual({
        title: 'Stats',
        description: 'Explore patterns and statistics from our word collection.',
        category: 'pages',
        secondaryText: 'For Nerds',
      });
    });
  });
});
