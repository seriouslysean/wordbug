import { describe, expect, it } from 'vitest';

import { getAvailableLengths, getWordsByLength, groupWordsByLength } from '~utils-client/word-data-utils';

describe('word length utilities', () => {
  it('returns unique lengths from all words', () => {
    const lengths = getAvailableLengths();
    expect(lengths).toEqual([4, 10, 11]);
  });

  it('filters words by specified length', () => {
    const words = getWordsByLength(10);
    expect(words).toHaveLength(1);
    expect(words[0].word).toBe('occasional');
  });

  it('groups words by length', () => {
    const groups = groupWordsByLength(global.mockWordData.map(entry => entry.data));
    expect(Object.keys(groups).map(Number).sort((a, b) => a - b)).toEqual([4, 10, 11]);
  });
});
