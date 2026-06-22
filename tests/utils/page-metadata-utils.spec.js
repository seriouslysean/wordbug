import {
  afterAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

// Mock the i18n utils to return predictable test data
vi.mock('#utils/i18n-utils', () => ({
  t: vi.fn((key, params = {}) => {
    const mockTranslations = {
      'words.heading': 'Mock Words Heading',
      'words.description': 'Mock words description',
      'words.length_words': `${params.length || 'X'}-Letter Words`,
      'words.length_words_description': `Words containing exactly ${params.length || 'X'} letters.`,
      'words.letter_words_description': `Words starting with the letter ${params.letter || 'X'}.`,
      'words.part_of_speech_words_description': `Words that function as ${params.partOfSpeech || 'unknown'}s in sentences.`,
      'words.by_length_heading': 'Mock words.by_length_heading',
      'words.by_length_description': 'Mock words.by_length_description',
      'stats.heading': 'Mock Stats Heading',
      'stats.description': 'Mock stats description',
      'stats.subheading': 'Mock Stats Subheading',
      'home.heading': 'Mock Home Heading',
      'error.heading': 'Mock Error Heading',
      'error.description': 'Mock error description',
      'parts_of_speech.noun': 'Noun',
      'parts_of_speech.verb': 'Verb',
      'parts_of_speech.adjective': 'Adjective'
    };
    return mockTranslations[key] || `Mock ${key}`;
  }),
  tp: vi.fn((baseKey, count) => `${count} Mock Items`)
}));

import {
  getAllPageMetadata,
  getDefinition,
  getPageMetadata,
  getPageTitle,
} from '#utils/page-metadata-utils';

// Clean up mock after this test file to prevent leakage to other tests
afterAll(() => {
  vi.doUnmock('#utils/i18n-utils');
  vi.resetModules();
});

// Test data
const mockWords = [
  { word: 'test', date: '20240101' },
  { word: 'example', date: '20240102' },
  { word: 'sample', date: '20240103' },
];

describe('page-metadata-utils', () => {
  describe('getPageMetadata', () => {
    it('returns metadata for static pages', () => {
      const metadata = getPageMetadata('/word', mockWords);
      expect(metadata).toEqual({
        title: 'Mock Words Heading',
        description: 'Mock words description',
        category: 'pages',
        secondaryText: '3 Mock Items',
      });
    });

    it('returns metadata for stats page', () => {
      const metadata = getPageMetadata('/stats', mockWords);
      expect(metadata).toEqual({
        title: 'Mock Stats Heading',
        description: 'Mock stats description',
        category: 'pages',
        secondaryText: 'Mock Stats Subheading',
      });
    });

    it('returns dynamic metadata for stats pages with counts', () => {
      const metadata = getPageMetadata('/stats/words-ending-ly', mockWords);
      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('category', 'stats');
      expect(metadata).toHaveProperty('description');
      expect(typeof metadata.title).toBe('string');
      expect(typeof metadata.description).toBe('string');
    });

    it('returns metadata for dynamic year pages', () => {
      const metadata = getPageMetadata('/browse/2024', mockWords);
      expect(metadata).toHaveProperty('title', '2024');
      expect(metadata).toHaveProperty('category', 'pages');
      expect(metadata).toHaveProperty('description');
      expect(metadata.description).toContain('2024');
      expect(typeof metadata.description).toBe('string');
    });

    it('returns metadata for dynamic month pages', () => {
      const metadata = getPageMetadata('/browse/2024/january', mockWords);
      expect(metadata).toEqual({
        title: 'January',
        description: 'Words from January 2024.',
        category: 'pages',
        secondaryText: '2024',
      });
    });

    it('returns metadata for length index page', () => {
      const metadata = getPageMetadata('/browse/length', mockWords);
      expect(metadata).toEqual({
        title: 'Mock words.by_length_heading',
        description: 'Mock words.by_length_description',
        category: 'pages',
        secondaryText: '3 Mock Items',
      });
    });

    it('returns metadata for individual length pages', () => {
      const metadata = getPageMetadata('/browse/length/8', mockWords);
      expect(metadata).toEqual({
        title: '8-Letter Words',
        description: 'Words containing exactly 8 letters.',
        category: 'pages',
        secondaryText: '0 Mock Items',
      });
    });

    it('returns metadata for dynamic length pages', () => {
      const metadata = getPageMetadata('/browse/length/4', mockWords);
      expect(metadata).toEqual({
        title: '4-Letter Words',
        description: 'Words containing exactly 4 letters.',
        category: 'pages',
        secondaryText: '1 Mock Items',
      });
    });

    it('returns metadata for 404 page', () => {
      const metadata = getPageMetadata('/404', mockWords);
      expect(metadata).toEqual({
        title: 'Mock Error Heading',
        description: 'Mock error description',
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
      expect(() => getPageMetadata()).toThrow('getPageMetadata: path is required');
    });
  });

  describe('getAllPageMetadata', () => {
    it('returns all static and dynamic pages', () => {
      const allPages = getAllPageMetadata(mockWords);

      expect(Array.isArray(allPages)).toBe(true);
      expect(allPages.length).toBeGreaterThan(0);

      // Should include static pages
      const wordsPage = allPages.find(page => page.path === '/word');
      expect(wordsPage).toBeDefined();
      expect(wordsPage.title).toBe('Mock Words Heading');
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
      expect(allPages.find(page => page.path === '/browse/2024')).toBeDefined();
      expect(allPages.find(page => page.path === '/browse/length')).toBeDefined();
      expect(allPages.find(page => page.path === '/browse/length/4')).toBeDefined();
    });
  });

  describe('getPageMetadata wrapper', () => {
    it('handles BASE_PATH prefixes', async () => {
      mockEnv.BASE_PATH = '/vocab';
      // Reset modules so the wrapper re-reads BASE_PATH instead of a value
      // cached by an earlier test file (the suite runs files in parallel).
      vi.resetModules();
      const { getPageMetadata: getPageMetadataWrapper } = await import(
        '#astro-utils/page-metadata'
      );
      const metadata = getPageMetadataWrapper('/vocab/stats');
      expect(metadata).toEqual({
        title: 'Mock Stats Heading',
        description: 'Mock stats description',
        category: 'pages',
        secondaryText: 'Mock Stats Subheading',
      });
    });

    it('handles BASE_PATH with different case and trailing slash', async () => {
      mockEnv.BASE_PATH = '/Vocab/';
      vi.resetModules();
      const { getPageMetadata: getPageMetadataWrapper } = await import(
        '#astro-utils/page-metadata'
      );
      const metadata = getPageMetadataWrapper('/Vocab/stats');
      expect(metadata).toEqual({
        title: 'Mock Stats Heading',
        description: 'Mock stats description',
        category: 'pages',
        secondaryText: 'Mock Stats Subheading',
      });
    });
  });

  describe('getDefinition', () => {
    it('returns the value for an existing key', () => {
      expect(getDefinition({ a: 1, b: 2 }, 'b')).toBe(2);
    });

    it('throws for a missing key', () => {
      expect(() => getDefinition({ a: 1 }, 'missing')).toThrow(
        'Missing definition for key: missing',
      );
    });
  });

  describe('getPageTitle', () => {
    it('returns Unknown Page for an empty path', () => {
      expect(getPageTitle('')).toBe('Unknown Page');
    });

    it('returns the static title for a known path', () => {
      expect(getPageTitle('/word')).toBe('Mock Words Heading');
    });

    it('returns the word for a word-detail path', () => {
      expect(getPageTitle('/word/example')).toBe('example');
    });

    it('returns the year for a year path', () => {
      expect(getPageTitle('/browse/2024')).toBe('2024');
    });

    it('returns the capitalized month name for a month path', () => {
      expect(getPageTitle('/browse/2024/january')).toBe('January');
    });

    it('returns the length-words title for a length path', () => {
      expect(getPageTitle('/browse/length/5')).toBe('5-Letter Words');
    });

    it('returns the uppercased letter for a letter path', () => {
      expect(getPageTitle('/browse/letter/a')).toBe('A');
    });

    it('returns the part-of-speech name for a part-of-speech path', () => {
      expect(getPageTitle('/browse/part-of-speech/noun')).toBe('Noun');
    });

    it('returns Unknown Page for a month path with an unknown month slug', () => {
      expect(getPageTitle('/browse/2024/notamonth')).toBe('Unknown Page');
    });

    it('returns Unknown Page for an unrecognized path', () => {
      expect(getPageTitle('/totally/unknown')).toBe('Unknown Page');
    });
  });

  describe('getPageMetadata dynamic paths', () => {
    it('returns metadata for a word-detail page', () => {
      expect(getPageMetadata('/word/example', mockWords)).toEqual({
        title: 'example',
        description: 'Definition and meaning of example.',
        category: 'pages',
      });
    });

    it('returns metadata for a part-of-speech page', () => {
      const metadata = getPageMetadata('/browse/part-of-speech/noun', mockWords);
      expect(metadata.title).toBe('Noun');
      expect(metadata.category).toBe('pages');
      expect(metadata.description).toContain('noun');
      expect(metadata.secondaryText).toBe('0 Mock Items');
    });

    it('returns home metadata for the root path', () => {
      const metadata = getPageMetadata('/', mockWords);
      expect(metadata.title).toBe('Mock Home Heading');
      expect(metadata.category).toBe('pages');
      expect(typeof metadata.description).toBe('string');
      expect(metadata.secondaryText).toBeUndefined();
    });

    it('falls back to Unknown Page for a month path with an unknown month slug', () => {
      expect(getPageMetadata('/browse/2024/notamonth', mockWords)).toEqual({
        title: 'Unknown Page',
        description: '',
        category: 'unknown',
        secondaryText: undefined,
      });
    });
  });
});
