import { describe, expect, it } from 'vitest';

import { normalizeWordData } from '#utils/word-data-normalizer';

const LEGACY_WORD = {
  word: 'Amblypygi',
  date: '20230106',
  adapter: 'wordnik',
  preserveCase: true,
  data: [
    {
      partOfSpeech: 'proper noun.',
      text: ['A taxonomic <xref>order</xref>', 'within <ant>the</ant> class.'],
      attributionText: 'from Wiktionary',
      sourceDictionary: 'wiktionary',
      sourceUrl: 'https://www.wordnik.com/words/Amblypygi',
      examples: [],
      synonyms: [' related ', ''],
      antonyms: [],
    },
    { partOfSpeech: 'idiom', text: 'An unclassified sense.' },
    { label: 'phrase', text: 'An explicitly labelled sense.' },
  ],
};

describe('normalizeWordData', () => {
  it('rewrites legacy definitions into canonical stored data without inventing labels', () => {
    expect(normalizeWordData(LEGACY_WORD, 'words/2023/20230106.json')).toEqual({
      word: {
        word: 'Amblypygi',
        date: '20230106',
        adapter: 'wordnik',
        preserveCase: true,
        data: [
          {
            partOfSpeech: 'noun',
            text: 'A taxonomic order within the class.',
            references: [{ start: 12, end: 17, url: 'https://www.wordnik.com/words/order' }],
            attributionText: 'from Wiktionary',
            sourceDictionary: 'wiktionary',
            sourceUrl: 'https://www.wordnik.com/words/Amblypygi',
            synonyms: [' related '],
          },
          { text: 'An unclassified sense.' },
          { label: 'phrase', text: 'An explicitly labelled sense.' },
        ],
      },
      needsClassificationReview: false,
    });
  });

  it('is idempotent for canonical data and flags a word with no classified definition', () => {
    const canonical = {
      word: 'pb&j',
      date: '20251023',
      adapter: 'merriam-webster',
      data: [{ text: 'peanut butter and jelly' }],
    };

    const first = normalizeWordData(canonical, 'words/2025/20251023.json');
    expect(first).toEqual({ word: canonical, needsClassificationReview: true });
    expect(normalizeWordData(first.word, 'words/2025/20251023.json')).toEqual(first);
  });

  it('leaves entity-shaped canonical text unchanged across repeated runs', () => {
    const canonical = {
      word: 'literal',
      date: '20250101',
      adapter: 'wordnik',
      data: [{ partOfSpeech: 'noun', text: '&lt;b&gt;literal&lt;/b&gt; &amp;lt;' }],
    };

    const first = normalizeWordData(canonical, 'words/2025/20250101.json');
    expect(first.word.data[0]?.text).toBe('&lt;b&gt;literal&lt;/b&gt; &amp;lt;');
    expect(normalizeWordData(first.word, 'words/2025/20250101.json')).toEqual(first);
  });

  it('preserves balanced tag-shaped canonical text without legacy markers', () => {
    const canonical = {
      word: 'literal',
      date: '20250101',
      adapter: 'wordnik',
      data: [{ partOfSpeech: 'noun', text: '<b>literal</b>' }],
    };

    expect(normalizeWordData(canonical, 'words/2025/20250101.json').word).toEqual(canonical);
  });

  it('refuses ambiguous reference markup without a legacy marker', () => {
    expect(() => normalizeWordData({
      word: 'ambiguous',
      date: '20250101',
      adapter: 'wordnik',
      data: [{ partOfSpeech: 'noun', text: '<xref>literal</xref>' }],
    }, 'words/2025/20250101.json')).toThrow('Ambiguous legacy reference markup');
  });

  it('preserves canonical text and reference offsets verbatim', () => {
    const canonical = {
      word: 'literal',
      date: '20250101',
      adapter: 'wordnik',
      data: [{
        partOfSpeech: 'noun',
        text: ' <b>rest</b> ',
        references: [{ start: 4, end: 8, url: 'https://example.com/rest' }],
      }],
    };

    expect(normalizeWordData(canonical, 'words/2025/20250101.json').word).toEqual(canonical);
  });

  // The canonical `id` is the headword of a definition's entry, which a page
  // compares with the word. The Wordnik adapter used to store Wordnik's sense
  // identifier there, which took the definition off its own word's page.
  it('drops the sense identifier a Wordnik record stored as an id, and changes nothing on the next run', () => {
    const stored = {
      word: 'candy corn',
      date: '20251103',
      adapter: 'wordnik',
      data: [
        { id: 'C5067000-1', partOfSpeech: 'noun', text: 'A small piece of candy.', sourceDictionary: 'ahd-5' },
        { partOfSpeech: 'noun', text: 'A confection of sugar and corn syrup.', sourceDictionary: 'wiktionary' },
      ],
    };

    const first = normalizeWordData(stored, 'words/2025/20251103.json');
    expect(first.word).toEqual({
      ...stored,
      data: [
        { partOfSpeech: 'noun', text: 'A small piece of candy.', sourceDictionary: 'ahd-5' },
        { partOfSpeech: 'noun', text: 'A confection of sugar and corn syrup.', sourceDictionary: 'wiktionary' },
      ],
    });
    expect(normalizeWordData(first.word, 'words/2025/20251103.json')).toEqual(first);
  });

  it.each(['merriam-webster', 'wiktionary', 'manual', 'wordnik'])("keeps the entry headwords a %s record stores as ids, a compound's included", (adapter) => {
    const canonical = {
      word: 'happy',
      date: '20250101',
      adapter,
      data: [
        { id: 'happy hour', partOfSpeech: 'noun', text: 'a period of reduced prices' },
        { id: 'happy', partOfSpeech: 'adjective', text: 'enjoying well-being' },
      ],
    };

    expect(normalizeWordData(canonical, 'words/2025/20250101.json').word).toEqual(canonical);
  });

  it('still refuses an id that is not a string on a Wordnik record', () => {
    expect(() => normalizeWordData({
      word: 'broken',
      date: '20250101',
      adapter: 'wordnik',
      data: [{ id: 1, partOfSpeech: 'noun', text: 'a sense' }],
    }, 'words/2025/20250101.json')).toThrow('Invalid definition id in words/2025/20250101.json');
  });

  it.each([
    [{ ...LEGACY_WORD, extra: true }, 'Unsupported word field'],
    [{ ...LEGACY_WORD, data: [{ text: 'test', extra: true }] }, 'Unsupported definition field'],
  ])('refuses unknown fields instead of silently discarding them', (word, message) => {
    expect(() => normalizeWordData(word, 'words/2025/20250101.json')).toThrow(message);
  });

  it.each([
    'an unclosed <xref>reference',
    'a mismatched <xref>reference</internalXref>',
    'a broken <internalXref>reference</internalXref>',
    'an unterminated <xref',
    'an empty <xref/> reference',
    'an empty <internalXref urlencoded="rest"/> reference',
  ])('refuses malformed markup rather than guessing: %s', (text) => {
    expect(() => normalizeWordData({
      word: 'broken',
      date: '20250101',
      adapter: 'wordnik',
      data: [{ partOfSpeech: 'noun', text }],
    }, 'words/2025/20250101.json')).toThrow('Malformed definition markup in words/2025/20250101.json');
  });

  it('refuses legacy markup that decodes into ambiguous markup on the next run', () => {
    expect(() => normalizeWordData({
      word: 'ambiguous',
      date: '20250101',
      adapter: 'wordnik',
      data: [{
        partOfSpeech: 'noun',
        text: '<i>&lt;xref&gt;rest&lt;/xref&gt;</i>',
        examples: [],
      }],
    }, 'words/2025/20250101.json')).toThrow('Legacy markup normalizes to ambiguous tag-shaped text');
  });

  it.each(['&lt;xref', '&lt;b'])('refuses legacy markup that decodes into malformed next-run input: %s', (encoded) => {
    expect(() => normalizeWordData({
      word: 'malformed',
      date: '20250101',
      adapter: 'wordnik',
      data: [{ partOfSpeech: 'noun', text: `<b>${encoded}</b>`, examples: [] }],
    }, 'words/2025/20250101.json')).toThrow('Legacy markup normalizes to malformed tag-shaped text');
  });
});
