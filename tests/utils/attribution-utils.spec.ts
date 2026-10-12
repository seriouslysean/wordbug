import { describe, expect, it } from 'vitest';

import type { DictionaryDefinition, WordData } from '#types';
import { getDefinitionLicense, getDictionaryCredits, WIKTIONARY_LICENSE } from '#utils/attribution-utils';

const word = (adapter: string, ...sourceDictionaries: Array<string | undefined>): WordData => ({
  word: 'test',
  date: '20250101',
  adapter,
  data: sourceDictionaries.map((sourceDictionary): DictionaryDefinition => ({
    partOfSpeech: 'noun',
    text: 'a test',
    ...(sourceDictionary ? { sourceDictionary } : {}),
  })),
});

const COLLEGIATE = "Merriam-Webster's Collegiate® Dictionary with Audio";
const MEDICAL = "Merriam-Webster's Medical Dictionary with Audio";

describe('attribution-utils', () => {
  describe('getDictionaryCredits', () => {
    it('owes nothing for no words', () => {
      expect(getDictionaryCredits([])).toEqual([]);
    });

    it('owes nothing for words written by hand', () => {
      expect(getDictionaryCredits([word('manual'), word('manual', undefined)])).toEqual([]);
    });

    it('owes nothing for an adapter it does not know', () => {
      expect(getDictionaryCredits([word('static', 'house-style')])).toEqual([]);
    });

    it('credits Merriam-Webster with the full title of the reference used', () => {
      expect(getDictionaryCredits([word('merriam-webster', 'collegiate', 'collegiate')]))
        .toEqual([{ type: 'merriam-webster', titles: [COLLEGIATE] }]);
    });

    it('names each Merriam-Webster reference once, in the order of its product list', () => {
      const words = [word('merriam-webster', 'medical'), word('merriam-webster', 'collegiate'), word('merriam-webster', 'medical')];

      expect(getDictionaryCredits(words)).toEqual([{ type: 'merriam-webster', titles: [COLLEGIATE, MEDICAL] }]);
    });

    it('credits Merriam-Webster without a title when the stored reference is not one of its products', () => {
      expect(getDictionaryCredits([word('merriam-webster', 'constructor'), word('merriam-webster', undefined)]))
        .toEqual([{ type: 'merriam-webster', titles: [] }]);
    });

    it('does not read a title from a record another adapter wrote', () => {
      expect(getDictionaryCredits([word('manual', 'collegiate')])).toEqual([]);
    });

    it('credits Wiktionary for a word its adapter supplied', () => {
      expect(getDictionaryCredits([word('wiktionary', 'wiktionary')])).toEqual([{ type: 'wiktionary' }]);
    });

    it('credits Wordnik while a word it supplied is stored, and Wiktionary too when the text is its', () => {
      expect(getDictionaryCredits([word('wordnik', 'ahd-5')])).toEqual([{ type: 'wordnik' }]);
      expect(getDictionaryCredits([word('wordnik', 'century', 'wiktionary')]))
        .toEqual([{ type: 'wiktionary' }, { type: 'wordnik' }]);
    });

    it('credits every dictionary a mixed site used, and only those', () => {
      const words = [word('manual'), word('wiktionary', 'wiktionary'), word('merriam-webster', 'collegiate')];

      expect(getDictionaryCredits(words)).toEqual([
        { type: 'merriam-webster', titles: [COLLEGIATE] },
        { type: 'wiktionary' },
      ]);
    });
  });

  describe('getDefinitionLicense', () => {
    it("names Wiktionary's licence for its text, whichever adapter fetched it", () => {
      expect(getDefinitionLicense({ sourceDictionary: 'wiktionary' })).toBe(WIKTIONARY_LICENSE);
      expect(WIKTIONARY_LICENSE.url).toBe('https://creativecommons.org/licenses/by-sa/4.0/');
    });

    it.each([
      ['Merriam-Webster', { sourceDictionary: 'collegiate', attributionText: "from Merriam-Webster's Collegiate Dictionary" }],
      ['a source it does not know', { sourceDictionary: 'ahd-5' }],
      ['a definition with no source', {}],
      ['no definition', null],
      ['a word without data', undefined],
    ])('asks for no credit on the page for %s', (_, meta) => {
      expect(getDefinitionLicense(meta)).toBeNull();
    });
  });
});
