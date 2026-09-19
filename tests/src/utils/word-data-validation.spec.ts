import { describe, expect, it, vi } from 'vitest';

const ctx = vi.hoisted(() => ({
  words: [{
    id: '2025/20250121',
    data: {
      word: 'occasional',
      date: '20250121',
      adapter: 'wordnik',
      data: [{
        text: 'a rest',
        partOfSpeech: 'noun',
        references: [{ start: 2, end: 9, url: 'https://example.com/rest' }],
      }],
    },
  }],
}));

vi.mock('astro:content', () => ({
  getCollection: vi.fn(() => Promise.resolve(ctx.words)),
}));

describe('word collection loading', () => {
  it('fails the build with the word and source id when stored data is invalid', async () => {
    await expect(import('#astro-utils/word-data-utils')).rejects.toThrow(
      'Invalid word data for "occasional" in 2025/20250121',
    );
  });
});
