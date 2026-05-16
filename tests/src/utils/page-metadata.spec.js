import { describe, expect, it, vi } from 'vitest';

vi.mock('#astro-utils/word-data-utils', () => ({
  allWords: [
    { word: 'first',  date: '20240101', data: [{ partOfSpeech: 'noun', text: 'a thing' }] },
    { word: 'second', date: '20240102', data: [{ partOfSpeech: 'noun', text: 'another' }] },
  ],
}));

vi.mock('#astro-utils/url-utils', () => ({
  stripBasePath: vi.fn(p => p.replace(/^\/wotd/, '') || '/'),
}));

vi.mock('#utils/page-metadata-utils', () => ({
  getPageMetadata: vi.fn((pathname, words) => ({ pathname, count: words.length })),
  getAllPageMetadata: vi.fn(words => words.map(w => ({ path: `/word/${w.word}` }))),
}));

import { getAllPageMetadata, getPageMetadata } from '#astro-utils/page-metadata';

describe('src/utils/page-metadata', () => {
  describe('getPageMetadata', () => {
    it('strips BASE_PATH and forwards to the pure helper with all words', () => {
      const result = getPageMetadata('/wotd/word/first');
      expect(result.pathname).toBe('/word/first');
      expect(result.count).toBe(2);
    });

    it('forwards root path through to the pure helper', () => {
      const result = getPageMetadata('/wotd/');
      expect(result.pathname).toBe('/');
    });
  });

  describe('getAllPageMetadata', () => {
    it('passes the cached allWords through to the pure helper', () => {
      const all = getAllPageMetadata();
      expect(all).toHaveLength(2);
      expect(all[0].path).toBe('/word/first');
    });
  });
});
