import { describe, expect, it, vi } from 'vitest';

const ctx = vi.hoisted(() => {
  const words = [
    { word: 'first',  date: '20240101', data: [{ partOfSpeech: 'noun', text: 'a thing' }] },
    { word: 'second', date: '20240102', data: [{ partOfSpeech: 'noun', text: 'another' }] },
  ];
  const lookup = vi.fn((pathname: string) => ({
    title: pathname,
    description: `Metadata for ${pathname}`,
    category: 'test',
  }));
  const createLookupInputs: Array<typeof words> = [];

  return {
    words,
    lookup,
    createLookupInputs,
    createLookup: vi.fn((input: typeof words) => {
      createLookupInputs.push(input);
      return lookup;
    }),
    getAll: vi.fn(),
    stripBasePath: vi.fn((pathname: string) => pathname.replace(/^\/wotd/, '') || '/'),
  };
});

vi.mock('#astro-utils/word-data-utils', () => ({
  allWords: ctx.words,
}));

vi.mock('#astro-utils/url-utils', () => ({
  stripBasePath: ctx.stripBasePath,
}));

vi.mock('#utils/page-metadata-utils', () => ({
  createPageMetadataLookup: ctx.createLookup,
  getAllPageMetadata: ctx.getAll.mockImplementation((words: Array<{ word: string }>) =>
    words.map(word => ({ path: `/word/${word.word}` }))),
}));

import { getAllPageMetadata, getPageMetadata } from '#astro-utils/page-metadata';

describe('src/utils/page-metadata', () => {
  describe('getPageMetadata', () => {
    it('strips BASE_PATH and forwards to the pure helper with all words', () => {
      const result = getPageMetadata('/wotd/word/first');
      expect(result.title).toBe('/word/first');
      expect(ctx.createLookupInputs).toStrictEqual([ctx.words]);
      expect(ctx.lookup).toHaveBeenCalledWith('/word/first');
    });

    it('forwards root path through to the pure helper', () => {
      const result = getPageMetadata('/wotd/');
      expect(result.title).toBe('/');
    });
  });

  describe('getAllPageMetadata', () => {
    it('passes the cached allWords through to the pure helper', () => {
      const all = getAllPageMetadata();
      expect(all).toHaveLength(2);
      expect(all[0]?.path).toBe('/word/first');
    });
  });
});
