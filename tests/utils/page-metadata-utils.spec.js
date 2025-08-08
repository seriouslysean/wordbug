import {
  describe,
  expect,
  it,
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
      });
    });

    it('returns metadata for stats page', () => {
      const metadata = getPageMetadata('stats', mockWords);
      expect(metadata).toEqual({
        title: 'Word Statistics',
        description: 'Explore patterns and statistics from our word collection.',
        category: 'pages',
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
        title: '2024 Words',
        description: 'Words from 2024, organized by month.',
        category: 'pages',
      });
    });

    it('returns metadata for dynamic month pages', () => {
      const metadata = getPageMetadata('words/2024/january', mockWords);
      expect(metadata).toEqual({
        title: 'January 2024',
        description: 'Words from January 2024.',
        category: 'pages',
      });
    });

    it('returns metadata for length index page', () => {
      const metadata = getPageMetadata('words/length', mockWords);
      expect(metadata).toEqual({
        title: 'Words by Length',
        description: 'Words organized by character length.',
        category: 'pages',
      });
    });

    it('returns metadata for individual length pages', () => {
      const metadata = getPageMetadata('words/length/8', mockWords);
      expect(metadata).toEqual({
        title: '8-Letter Words',
        description: 'Words containing exactly 8 letters.',
        category: 'pages',
      });
    });

    it('returns metadata for dynamic length pages', () => {
      const metadata = getPageMetadata('words/length/4', mockWords);
      expect(metadata).toEqual({
        title: '4-Letter Words',
        description: 'Words containing exactly 4 letters.',
        category: 'pages',
      });
    });

    it('returns fallback metadata for unknown paths', () => {
      const metadata = getPageMetadata('unknown-path', mockWords);
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
});