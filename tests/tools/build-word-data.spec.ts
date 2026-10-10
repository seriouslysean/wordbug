import { describe, expect, it } from 'vitest';

import { buildWordData } from '#tools/utils';
import type { DictionaryResponse } from '#types';

const baseResponse = (overrides: Partial<DictionaryResponse> = {}): DictionaryResponse => ({
  word: 'speed',
  definitions: [{ partOfSpeech: 'noun', text: 'the rate of motion' }],
  meta: { source: 'Merriam-Webster', attribution: 'from MW', url: 'https://example.com' },
  ...overrides,
});

describe('buildWordData', () => {
  it('omits enrichment when there is nothing to store', () => {
    const wordData = buildWordData({
      word: 'speed',
      date: '20250101',
      adapterName: 'merriam-webster',
      response: baseResponse(),
    });
    expect(wordData.enrichment).toBeUndefined();
    expect(wordData.preserveCase).toBe(false);
    expect(wordData.data).toHaveLength(1);
    expect(wordData.adapter).toBe('merriam-webster');
  });

  it('folds headword capture and WordNet relations into one enrichment object, omitting empties', () => {
    const wordData = buildWordData({
      word: 'speed',
      date: '20250101',
      adapterName: 'merriam-webster',
      response: baseResponse({ headword: { pronunciation: 'spēd', etymology: 'Old English spēd' } }),
      relations: { synonyms: ['velocity'], antonyms: [], related: ['motion'] },
    });
    expect(wordData.enrichment).toEqual({
      pronunciation: 'spēd',
      etymology: 'Old English spēd',
      synonyms: ['velocity'],
      related: ['motion'],
    });
    expect(wordData.enrichment?.antonyms).toBeUndefined();
  });

  it('keeps stored enrichment the refreshed response does not supply', () => {
    // A fallback adapter returns definitions only, and WordNet was unavailable.
    const wordData = buildWordData({
      word: 'speed',
      date: '20250101',
      adapterName: 'wiktionary',
      response: baseResponse(),
      relations: null,
      storedEnrichment: { pronunciation: 'spēd', synonyms: ['velocity'] },
    });
    expect(wordData.enrichment).toEqual({ pronunciation: 'spēd', synonyms: ['velocity'] });
  });

  it('passes through preserveCase', () => {
    const wordData = buildWordData({
      word: 'Japan',
      date: '20250101',
      adapterName: 'merriam-webster',
      response: baseResponse(),
      preserveCase: true,
    });
    expect(wordData.preserveCase).toBe(true);
  });
});
