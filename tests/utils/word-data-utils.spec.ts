import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  getAdjacentWords,
  getCurrentWord,
  getPastWords,
  getWordByDate,
  getWordsByLength,
  getWordsByMonth,
  groupWordsByLength,
  groupWordsByMonth,
  groupWordsByYear,
  groupWordsByLetter,
  getWordsByLetter,
  groupWordsByPartOfSpeech,
  getWordsByPartOfSpeech,
} from '#astro-utils/word-data-utils';
import {
  getAvailableLengths,
  getAvailableMonths,
  getAvailableYears,
  getWordsByYear,
  getAvailableLetters,
  getAvailablePartsOfSpeech,
  findValidDefinition,
  getDisplayableDefinitions,
  isValidDictionaryData,
  getWordDetails,
  getWordSenses,
  getWordsByPartOfSpeech as getWordsByPartOfSpeechPure,
  groupWordsByPartOfSpeech as groupWordsByPartOfSpeechPure,
  corpusRelationMatch,
  corpusRelations,
  mergeEnrichment,
  findCurrentWord,
  getPreviousWords,
} from '#utils/word-data-utils';
import {
  extractWordDefinition,
} from '#astro-utils/word-data-utils';
import type { DictionaryDefinition, WordData } from '#types';

const makeWord = (word: string, date: string, data: DictionaryDefinition[] = []): WordData => ({
  word,
  date,
  adapter: 'test',
  data,
});

const requireValue = <T>(value: T | null | undefined): T => {
  if (value == null) {
    throw new Error('Expected a value');
  }
  return value;
};

describe('word-data-utils', () => {
  // Mock data sorted by descending date (newest first) like real getWordsFromCollection
  const mockWordData: WordData[] = [
    makeWord('current', '20250110', [{ text: 'Current word', partOfSpeech: 'adjective' }]),
    makeWord('yesterday', '20250109', [{ text: 'Yesterday word', partOfSpeech: 'noun' }]),
    makeWord('older', '20250105', [{ text: 'Older word', partOfSpeech: 'adjective' }]),
    makeWord('zebra', '20250103', [{ text: 'Zebra word', partOfSpeech: 'noun' }]),
    makeWord('banana', '20250102', [{ text: 'Banana word', partOfSpeech: 'noun' }]),
    makeWord('apple', '20250101', [{ text: 'Apple word', partOfSpeech: 'noun' }]),
    makeWord('year2024', '20241225', [{ text: '2024 word', partOfSpeech: 'noun' }]),
    makeWord('year2023', '20231201', [{ text: '2023 word', partOfSpeech: 'verb' }]),
  ];

  // Mock data with pre-normalized POS (adapters normalize at fetch time)
  const mockWordDataWithComplexPartOfSpeech: WordData[] = [
    makeWord('run', '20250120', [
      { text: 'To move swiftly', partOfSpeech: 'verb' },
      { text: 'A distance run', partOfSpeech: 'noun' }
    ]),
    makeWord('beautiful', '20250119', [{ text: 'Pleasing to look at', partOfSpeech: 'adjective' }]),
    makeWord('quickly', '20250118', [{ text: 'In a quick manner', partOfSpeech: 'adverb' }]),
    makeWord('help', '20250117', [{ text: 'To assist', partOfSpeech: 'verb' }]),
    makeWord('indices', '20250114', [{ text: 'Plural of index', partOfSpeech: 'noun' }]),
    makeWord('the', '20250116', [{ text: 'Definite article', partOfSpeech: 'article' }]),
    makeWord('have', '20250115', [{ text: 'Auxiliary verb', partOfSpeech: 'verb' }]),
  ];


  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getCurrentWord', () => {
    it('returns most recent word not after today', () => {
      const result = requireValue(getCurrentWord(mockWordData));
      expect(result.word).toBe('current');
      expect(result.date).toBe('20250110');
    });

    it('returns first word when no words match date criteria', () => {
      const futureWords = [
        // future date
        makeWord('future', '20250115'),
      ];
      const result = requireValue(getCurrentWord(futureWords));
      expect(result.word).toBe('future');
    });

    it('returns null when no words available', () => {
      const result = getCurrentWord([]);
      expect(result).toBeNull();
    });

    describe('near midnight, where the UTC date and the local date differ', () => {
      afterEach(() => {
        vi.unstubAllEnvs();
      });

      it('does not publish tomorrow\'s word while it is still this evening locally', () => {
        // 21:00 on Jan 10 in New York is already Jan 11 in UTC
        vi.stubEnv('TZ', 'America/New_York');
        vi.setSystemTime(new Date('2025-01-11T02:00:00Z'));
        const words = [makeWord('tomorrow', '20250111'), ...mockWordData];

        expect(requireValue(getCurrentWord(words)).word).toBe('current');
      });

      it('publishes today\'s word once it is past midnight locally', () => {
        // 01:00 on Jan 10 in Tokyo is still Jan 9 in UTC
        vi.stubEnv('TZ', 'Asia/Tokyo');
        vi.setSystemTime(new Date('2025-01-09T16:00:00Z'));

        expect(requireValue(getCurrentWord(mockWordData)).word).toBe('current');
      });
    });
  });

  describe('getPastWords', () => {
    it('returns words before given date', () => {
      const result = getPastWords('20250110', mockWordData);
      const [first, second, third, fourth, fifth] = result;

      expect(result).toHaveLength(5);
      expect(requireValue(first).word).toBe('yesterday');
      expect(requireValue(second).word).toBe('older');
      // sorted order: current, yesterday, older, zebra, banana
      expect(requireValue(third).word).toBe('zebra');
      expect(requireValue(fourth).word).toBe('banana');
      expect(requireValue(fifth).word).toBe('apple');
    });

    it('limits to 5 words', () => {
      const manyWords = Array.from({ length: 10 }, (_, i) => makeWord(
        `word${i}`,
        // descending dates
        `2025010${9 - i}`,
      ));
      const result = getPastWords('20250110', manyWords);
      expect(result).toHaveLength(5);
    });

    it('returns empty array for empty date', () => {
      expect(getPastWords('', mockWordData)).toEqual([]);
      // @ts-expect-error null is a deliberate invalid runtime input.
      expect(getPastWords(null, mockWordData)).toEqual([]);
    });
  });

  describe('getWordByDate', () => {
    it('finds word by exact date match', () => {
      const result = requireValue(getWordByDate('20250109', mockWordData));
      expect(result.word).toBe('yesterday');
    });

    it('returns null for non-existent date', () => {
      // use non-existent date
      const result = getWordByDate('20250199', mockWordData);
      expect(result).toBeNull();
    });

    it('returns null for empty date', () => {
      expect(getWordByDate('', mockWordData)).toBeNull();
      // @ts-expect-error null is a deliberate invalid runtime input.
      expect(getWordByDate(null, mockWordData)).toBeNull();
    });
  });

  describe('getAdjacentWords', () => {
    it('returns previous and next words', () => {
      const result = getAdjacentWords('20250109', mockWordData);
      // older date
      expect(requireValue(result.previousWord).word).toBe('older');
      // newer date
      expect(requireValue(result.nextWord).word).toBe('current');
    });

    it('handles word at beginning of array', () => {
      const result = getAdjacentWords('20250110', mockWordData);
      expect(requireValue(result.previousWord).word).toBe('yesterday');
      // no newer word
      expect(result.nextWord).toBeNull();
    });

    it('handles word at end of array', () => {
      const result = getAdjacentWords('20231201', mockWordData);
      // year2023 is last (oldest), no older word
      expect(result.previousWord).toBeNull();
      // next newer word
      expect(requireValue(result.nextWord).word).toBe('year2024');
    });

    it('returns null for non-existent date', () => {
      // use non-existent date
      const result = getAdjacentWords('20250199', mockWordData);
      expect(result.previousWord).toBeNull();
      expect(result.nextWord).toBeNull();
    });
  });

  describe('getWordDetails', () => {
    it('handles missing word data', () => {
      // @ts-expect-error null is a deliberate invalid runtime input.
      expect(getWordDetails(null)).toEqual({ partOfSpeech: '', definition: '', meta: null });
      expect(getWordDetails({ word: 'test', date: '20250101', adapter: 'wordnik', data: [] }))
        .toEqual({ partOfSpeech: '', definition: '', meta: null });
    });

    it('reads the first displayable definition and its source from the stored record', () => {
      const word: WordData = {
        word: 'test',
        date: '20250101',
        adapter: 'merriam-webster',
        data: [
          { text: 'No part of speech', sourceUrl: 'https://example.com/other' },
          {
            text: 'An MW def',
            partOfSpeech: 'verb',
            attributionText: "from Merriam-Webster's Collegiate Dictionary",
            sourceDictionary: 'collegiate',
            sourceUrl: 'https://www.merriam-webster.com/dictionary/test',
          },
        ],
      };

      expect(getWordDetails(word)).toEqual({
        partOfSpeech: 'verb',
        definition: 'An MW def',
        meta: {
          attributionText: "from Merriam-Webster's Collegiate Dictionary",
          sourceDictionary: 'collegiate',
          sourceUrl: 'https://www.merriam-webster.com/dictionary/test',
        },
      });
    });

    it('needs no adapter: a record from any source, or none, reads the same way', () => {
      const data: DictionaryDefinition[] = [{
        text: 'A taxonomic order',
        partOfSpeech: 'noun',
        references: [{ start: 12, end: 17, url: 'https://www.wordnik.com/words/order' }],
      }];

      for (const adapter of ['wordnik', 'wiktionary', 'static']) {
        expect(getWordDetails({ word: 'test', date: '', adapter, data })).toEqual({
          partOfSpeech: 'noun',
          definition: 'A taxonomic order',
          meta: { attributionText: undefined, sourceDictionary: undefined, sourceUrl: undefined },
        });
      }
    });
  });

  describe('getWordsByYear', () => {
    it('filters words by year', () => {
      const result2025 = getWordsByYear('2025', mockWordData);
      // current, yesterday, older, apple, banana, zebra
      expect(result2025).toHaveLength(6);
      expect(result2025.every(w => w.date.startsWith('2025'))).toBe(true);

      const result2024 = getWordsByYear('2024', mockWordData);
      expect(result2024).toHaveLength(1);
      expect(requireValue(result2024[0]).word).toBe('year2024');
    });

    it('returns empty array for non-existent year', () => {
      const result = getWordsByYear('2020', mockWordData);
      expect(result).toEqual([]);
    });
  });

  describe('getWordsByMonth', () => {
    it('filters words by month within a year', () => {
      const result = getWordsByMonth('2025', '01', mockWordData);
      // all 2025 words are in January
      expect(result).toHaveLength(6);
      expect(result.every(w => w.date.startsWith('202501'))).toBe(true);

      const result2024 = getWordsByMonth('2024', '12', mockWordData);
      expect(result2024).toHaveLength(1);
      expect(requireValue(result2024[0]).word).toBe('year2024');
    });

    it('returns empty array for non-existent month', () => {
      const result = getWordsByMonth('2025', '02', mockWordData);
      expect(result).toEqual([]);
    });
  });

  describe('getAvailableMonths', () => {
    it('returns unique months for a year in ascending order', () => {
      const extended = [...mockWordData, makeWord('feb', '20250201')];
      const result = getAvailableMonths('2025', extended);
      expect(result).toEqual(['01', '02']);

      const result2024 = getAvailableMonths('2024', mockWordData);
      expect(result2024).toEqual(['12']);
    });

    it('returns empty array for year with no words', () => {
      const result = getAvailableMonths('2020', mockWordData);
      expect(result).toEqual([]);
    });
  });

  describe('groupWordsByYear', () => {
    it('groups words by year correctly', () => {
      const result = groupWordsByYear(mockWordData);
      expect(result['2025']).toHaveLength(6);
      expect(result['2024']).toHaveLength(1);
      expect(result['2023']).toHaveLength(1);
    });

    it('handles empty array', () => {
      const result = groupWordsByYear([]);
      expect(result).toEqual({});
    });
  });

  describe('groupWordsByMonth', () => {
    it('groups words by month slug for a given year', () => {
      const result = groupWordsByMonth('2025', mockWordData);
      expect(Object.keys(result)).toContain('january');
      expect(result['january']).toHaveLength(6);
    });

    it('returns empty object when no words match the year', () => {
      const result = groupWordsByMonth('2020', mockWordData);
      expect(result).toEqual({});
    });

    it('groups words with different months correctly', () => {
      const extendedData = [...mockWordData, makeWord('feb', '20250201')];
      const result = groupWordsByMonth('2025', extendedData);
      expect(Object.keys(result)).toEqual(expect.arrayContaining(['january', 'february']));
      expect(result['january']).toHaveLength(6);
      expect(result['february']).toHaveLength(1);
    });

    it('uses month slugs as keys', () => {
      const result = groupWordsByMonth('2025', mockWordData);
      // lowercase month name
      expect(Object.keys(result)).toEqual(['january']);
    });
  });

  describe('getAvailableYears', () => {
    it('returns unique years in descending order', () => {
      const result = getAvailableYears(mockWordData);
      expect(result).toEqual(['2025', '2024', '2023']);
    });

    it('returns empty array for no words', () => {
      const result = getAvailableYears([]);
      expect(result).toEqual([]);
    });
  });

  describe('length utilities', () => {
    it('returns sorted unique lengths', () => {
      const result = getAvailableLengths(mockWordData);
      // apple=5, banana/zebra=6, current=7, yesterday=8, older=5, year2024/year2023=8
      expect(result).toEqual([5, 6, 7, 8, 9]);
    });

    it('filters words by specified length', () => {
      const result = getWordsByLength(8, mockWordData);
      expect(result).toHaveLength(2);
      expect(result.every(w => w.word.length === 8)).toBe(true);
    });

    it('groups words by length', () => {
      const result = groupWordsByLength(mockWordData);
      expect(Object.keys(result).map(Number).toSorted((a, b) => a - b)).toEqual([5, 6, 7, 8, 9]);
      // year2024=8, year2023=8 (yesterday=9)
      expect(result[8]).toHaveLength(2);
    });
  });

  describe('letter utilities', () => {
    it('returns sorted unique starting letters', () => {
      const result = getAvailableLetters(mockWordData);
      expect(result).toEqual(['a', 'b', 'c', 'o', 'y', 'z']);
    });

    it('filters words by starting letter', () => {
      const resultA = getWordsByLetter('a', mockWordData);
      expect(resultA).toHaveLength(1);
      expect(requireValue(resultA[0]).word).toBe('apple');

      // test case insensitive
      const resultY = getWordsByLetter('Y', mockWordData);
      expect(resultY).toHaveLength(3);
      expect(resultY.map(w => w.word).toSorted()).toEqual(['year2023', 'year2024', 'yesterday']);
    });

    it('groups words by starting letter', () => {
      const result = groupWordsByLetter(mockWordData);
      const aWords = requireValue(result.a);
      const bWords = requireValue(result.b);
      const yWords = requireValue(result.y);
      const zWords = requireValue(result.z);

      expect(aWords).toHaveLength(1);
      expect(requireValue(aWords[0]).word).toBe('apple');

      expect(bWords).toHaveLength(1);
      expect(requireValue(bWords[0]).word).toBe('banana');

      expect(yWords).toHaveLength(3);
      expect(yWords.map(w => w.word)).toEqual(['year2023', 'year2024', 'yesterday']);

      expect(zWords).toHaveLength(1);
      expect(requireValue(zWords[0]).word).toBe('zebra');
    });

    it('sorts words within letter groups alphabetically', () => {
      const result = groupWordsByLetter(mockWordData);
      const yWords = requireValue(result.y);
      // alphabetically first
      expect(requireValue(yWords[0]).word).toBe('year2023');
      expect(requireValue(yWords[1]).word).toBe('year2024');
      expect(requireValue(yWords[2]).word).toBe('yesterday');
    });

    it('ignores non-alphabetic starting characters', () => {
      const dataWithNumbers = [...mockWordData,
        makeWord('123number', '20250201'),
        makeWord('!exclamation', '20250202'),
      ];

      const letters = getAvailableLetters(dataWithNumbers);
      // no numbers or symbols
      expect(letters).toEqual(['a', 'b', 'c', 'o', 'y', 'z']);

      const grouped = groupWordsByLetter(dataWithNumbers);
      expect(grouped['1']).toBeUndefined();
      expect(grouped['!']).toBeUndefined();
    });

    it('handles empty arrays', () => {
      expect(getAvailableLetters([])).toEqual([]);
      expect(getWordsByLetter('a', [])).toEqual([]);
      expect(groupWordsByLetter([])).toEqual({});
    });
  });

  describe('findValidDefinition', () => {
    it('finds first definition with partOfSpeech', () => {
      const definitions: DictionaryDefinition[] = [
        { text: 'No part of speech' },
        { text: 'Valid definition', partOfSpeech: 'noun' },
        { text: 'Another valid', partOfSpeech: 'verb' },
      ];
      const result = findValidDefinition(definitions);
      expect(result).toEqual({ text: 'Valid definition', partOfSpeech: 'noun' });
    });

    it('returns null for empty array', () => {
      expect(findValidDefinition([])).toBeNull();
    });

    it('returns null when no definitions have partOfSpeech', () => {
      const definitions: DictionaryDefinition[] = [
        { text: 'No part of speech' },
        { text: 'Another without' },
      ];
      expect(findValidDefinition(definitions)).toBeNull();
    });

    it('returns canonical text without its outer whitespace', () => {
      const definitions: DictionaryDefinition[] = [
        { text: ' A taxonomic order & class ', partOfSpeech: 'noun' },
      ];
      expect(findValidDefinition(definitions)).toEqual({ text: 'A taxonomic order & class', partOfSpeech: 'noun' });
    });

    it('skips empty text values', () => {
      const definitions: DictionaryDefinition[] = [
        { text: '', partOfSpeech: 'noun' },
        { text: '   ', partOfSpeech: 'verb' },
        { text: 'Valid', partOfSpeech: 'adjective' },
      ];
      const result = findValidDefinition(definitions);
      expect(result).toEqual({ text: 'Valid', partOfSpeech: 'adjective' });
    });
  });

  describe('extractWordDefinition', () => {
    it('uses findValidDefinition to skip definitions without partOfSpeech', () => {
      const wordData = makeWord('test', '20250101', [
          { text: 'No part of speech' },
          { text: 'Valid definition', partOfSpeech: 'noun' },
      ]);
      const result = extractWordDefinition(wordData);
      expect(result).toEqual({ definition: 'Valid definition', partOfSpeech: 'noun' });
    });

    it('returns empty strings when no valid definition found', () => {
      const wordData = makeWord('test', '20250101', [{ text: 'No part of speech' }]);
      const result = extractWordDefinition(wordData);
      expect(result).toEqual({ definition: '', partOfSpeech: '' });
    });
  });

  describe('part-of-speech utilities', () => {
    it('returns sorted unique parts of speech', () => {
      const result = getAvailablePartsOfSpeech(mockWordDataWithComplexPartOfSpeech);
      expect(result).toEqual(['adjective', 'adverb', 'article', 'noun', 'verb']);
    });

    it('filters words by part of speech', () => {
      const nouns = getWordsByPartOfSpeech('noun', mockWordDataWithComplexPartOfSpeech);
      // 'run' and 'indices'
      expect(nouns).toHaveLength(2);
      expect(nouns.map(w => w.word).toSorted()).toEqual(['indices', 'run']);

      const verbs = getWordsByPartOfSpeech('verb', mockWordDataWithComplexPartOfSpeech);
      // 'run', 'help', 'have'
      expect(verbs).toHaveLength(3);
      expect(verbs.map(w => w.word).toSorted()).toEqual(['have', 'help', 'run']);
    });

    it('groups words by part of speech', () => {
      const result = groupWordsByPartOfSpeech(mockWordDataWithComplexPartOfSpeech);
      const nouns = requireValue(result.noun);
      const verbs = requireValue(result.verb);
      const adjectives = requireValue(result.adjective);
      const adverbs = requireValue(result.adverb);
      const articles = requireValue(result.article);

      expect(nouns).toHaveLength(2);
      expect(nouns.map(w => w.word)).toEqual(['indices', 'run']);

      expect(verbs).toHaveLength(3);
      // sorted alphabetically
      expect(verbs.map(w => w.word)).toEqual(['have', 'help', 'run']);

      expect(adjectives).toHaveLength(1);
      expect(requireValue(adjectives[0]).word).toBe('beautiful');

      expect(adverbs).toHaveLength(1);
      expect(requireValue(adverbs[0]).word).toBe('quickly');

      expect(articles).toHaveLength(1);
      expect(requireValue(articles[0]).word).toBe('the');
    });

    it('avoids duplicate words in groups when word has multiple definitions', () => {
      const result = groupWordsByPartOfSpeech(mockWordDataWithComplexPartOfSpeech);

      // 'run' appears in both noun and verb groups but only once in each
      expect(requireValue(result.noun).filter(w => w.word === 'run')).toHaveLength(1);
      expect(requireValue(result.verb).filter(w => w.word === 'run')).toHaveLength(1);
    });

    it('handles words with no part of speech', () => {
      const dataWithMissingPartOfSpeech: WordData[] = [
        makeWord('test', '20250120', [{ text: 'Test definition' }]),
        makeWord('valid', '20250119', [{ text: 'Valid definition', partOfSpeech: 'adjective' }]),
      ];

      const result = getAvailablePartsOfSpeech(dataWithMissingPartOfSpeech);
      expect(result).toEqual(['adjective']);

      const grouped = groupWordsByPartOfSpeech(dataWithMissingPartOfSpeech);
      expect(grouped['adjective']).toHaveLength(1);
      expect(requireValue(requireValue(grouped.adjective)[0]).word).toBe('valid');
    });

    it('leaves non-base parts of speech out of the browse groups', () => {
      const data: WordData[] = [
        // @ts-expect-error Noncanonical part of speech is a deliberate invalid runtime input.
        makeWord('kick the bucket', '20250120', [{ text: 'to die', partOfSpeech: 'idiom' }]),
        makeWord('valid', '20250119', [{ text: 'Valid definition', partOfSpeech: 'adjective' }]),
      ];

      expect(Object.keys(groupWordsByPartOfSpeech(data))).toEqual(['adjective']);
    });

    it('handles empty arrays', () => {
      expect(getAvailablePartsOfSpeech([])).toEqual([]);
      expect(getWordsByPartOfSpeech('noun', [])).toEqual([]);
      expect(groupWordsByPartOfSpeech([])).toEqual({});
    });
  });
});

describe('pure groupWords* helpers (utils/word-data-utils)', () => {
  const data: WordData[] = [
    makeWord('apple', '20240105', [{ partOfSpeech: 'noun', text: 'fruit' }]),
    makeWord('amber', '20240107', [{ partOfSpeech: 'noun', text: 'color' }]),
    makeWord('run', '20240310', [{ partOfSpeech: 'verb', text: 'move' }]),
    makeWord('fast', '20250120', [{ partOfSpeech: 'adjective', text: 'quick' }, { partOfSpeech: 'adverb', text: 'quickly' }]),
    makeWord('older', '20231215', [{ partOfSpeech: 'adjective', text: 'aged' }]),
  ];

  it('groupWordsByLength buckets by character length', async () => {
    const { groupWordsByLength: pure } = await import('#utils/word-data-utils');
    const result = pure(data);
    expect(Object.keys(result).map(Number).toSorted((a, b) => a - b)).toEqual([3, 4, 5]);
    expect(requireValue(result[3]).map(w => w.word)).toEqual(['run']);
    expect(requireValue(result[5]).map(w => w.word).toSorted()).toEqual(['amber', 'apple', 'older']);
  });

  it('groupWordsByLetter buckets by first letter, lowercased', async () => {
    const { groupWordsByLetter: pure } = await import('#utils/word-data-utils');
    const result = pure(data);
    expect(requireValue(result.a).map(w => w.word).toSorted()).toEqual(['amber', 'apple']);
    expect(result.r).toHaveLength(1);
  });

  it('groupWordsByYear buckets by YYYY prefix of date', async () => {
    const { groupWordsByYear: pure } = await import('#utils/word-data-utils');
    const result = pure(data);
    expect(result['2024']).toHaveLength(3);
    expect(result['2025']).toHaveLength(1);
    expect(result['2023']).toHaveLength(1);
  });

  it('groupWordsByPartOfSpeech places multi-POS words in every bucket exactly once', async () => {
    const { groupWordsByPartOfSpeech: pure } = await import('#utils/word-data-utils');
    const result = pure(data);
    expect(requireValue(result.adjective).map(w => w.word).toSorted()).toEqual(['fast', 'older']);
    expect(requireValue(result.adverb).map(w => w.word)).toEqual(['fast']);
    expect(requireValue(result.noun).map(w => w.word).toSorted()).toEqual(['amber', 'apple']);
    expect(requireValue(result.verb).map(w => w.word)).toEqual(['run']);
  });

  it('group helpers return empty objects for empty input', async () => {
    const { groupWordsByLength: gl, groupWordsByLetter: gle, groupWordsByYear: gy, groupWordsByPartOfSpeech: gp } = await import('#utils/word-data-utils');
    expect(gl([])).toEqual({});
    expect(gle([])).toEqual({});
    expect(gy([])).toEqual({});
    expect(gp([])).toEqual({});
  });
});

describe('word-page surfacing helpers (utils/word-data-utils)', () => {
  // Shapes taken from stored records: "sad" carries its adjective senses plus
  // the abbreviation SAD; "pb&j" carries nothing but its abbreviation.
  const sadLike: WordData = {
    word: 'sad',
    date: '20250103',
    adapter: 'merriam-webster',
    data: [
      { id: 'sad', partOfSpeech: 'adjective', text: 'affected with or expressive of grief or unhappiness' },
      { id: 'SAD', partOfSpeech: 'abbreviation', text: 'seasonal affective disorder' },
    ],
  };
  const pbjLike: WordData = {
    word: 'pb&j',
    date: '20250102',
    adapter: 'merriam-webster',
    data: [{ id: 'PB+J', partOfSpeech: 'abbreviation', text: 'peanut butter and jelly' }],
  };
  const textOnly: WordData = {
    word: 'unlabelled',
    date: '20250101',
    adapter: 'merriam-webster',
    data: [{ id: 'unlabelled', text: 'text with no part of speech' }],
  };
  const emptyText: WordData = {
    word: 'blank',
    date: '20241231',
    adapter: 'merriam-webster',
    data: [{ id: 'blank', partOfSpeech: 'noun', text: '   ' }],
  };

  describe('getDisplayableDefinitions', () => {
    it('requires a part of speech and non-empty text', () => {
      expect(getDisplayableDefinitions([{ partOfSpeech: 'noun', text: 'a thing' }])).toHaveLength(1);
      expect(getDisplayableDefinitions(textOnly.data)).toEqual([]);
      expect(getDisplayableDefinitions(emptyText.data)).toEqual([]);
      // @ts-expect-error Missing text is a deliberate invalid runtime input.
      expect(getDisplayableDefinitions([{ partOfSpeech: 'noun' }])).toEqual([]);
      // @ts-expect-error Noncanonical part of speech is a deliberate invalid runtime input.
      expect(getDisplayableDefinitions([{ partOfSpeech: '  ', text: 'a thing' }])).toEqual([]);
    });

    it('refuses legacy text fragments', () => {
      // @ts-expect-error Legacy text fragments are a deliberate invalid runtime input.
      expect(getDisplayableDefinitions([{ partOfSpeech: 'noun', text: ['a', 'thing'] }])).toEqual([]);
    });

    it('returns nothing for a missing definitions array', () => {
      // @ts-expect-error undefined is a deliberate invalid runtime input.
      expect(getDisplayableDefinitions(undefined)).toEqual([]);
    });

    it('hides abbreviations from a word that has a grammatical definition', () => {
      expect(getDisplayableDefinitions(sadLike.data)).toEqual([requireValue(sadLike.data[0])]);
    });

    it('hides abbreviations whatever order the dictionary lists them in', () => {
      expect(getDisplayableDefinitions(sadLike.data.toReversed())).toEqual([requireValue(sadLike.data[0])]);
    });

    it('shows abbreviations when they are all the word has', () => {
      expect(getDisplayableDefinitions(pbjLike.data)).toEqual(pbjLike.data);
    });

    it('does not let an undisplayable grammatical definition hide an abbreviation', () => {
      const data: DictionaryDefinition[] = [{ partOfSpeech: 'noun', text: '' }, ...pbjLike.data];
      expect(getDisplayableDefinitions(data)).toEqual(pbjLike.data);
    });
  });

  describe('isValidDictionaryData', () => {
    it('validates array with valid dictionary definitions', () => {
      const validData: DictionaryDefinition[] = [
        {
          text: 'A test definition',
          partOfSpeech: 'noun'
        },
        {
          text: 'To test something',
          partOfSpeech: 'verb'
        }
      ];

      expect(isValidDictionaryData(validData)).toBe(true);
    });

    it('refuses entries having only text, which no page could display', () => {
      expect(isValidDictionaryData([{ text: 'A definition with text only' }])).toBe(false);
    });

    it('refuses entries classified only by a label, which is not a part of speech', () => {
      expect(isValidDictionaryData([{ label: 'biographical name', text: 'American seismologist' }])).toBe(false);
    });

    it('refuses entries having only partOfSpeech', () => {
      // @ts-expect-error Missing text is a deliberate invalid runtime input.
      expect(isValidDictionaryData([{ partOfSpeech: 'noun' }])).toBe(false);
    });

    it('accepts a word whose only definitions are abbreviations', () => {
      expect(isValidDictionaryData([{ partOfSpeech: 'abbreviation', text: 'peanut butter and jelly' }])).toBe(true);
    });

    it('rejects empty array', () => {
      expect(isValidDictionaryData([])).toBe(false);
    });

    it('rejects non-array input', () => {
      // @ts-expect-error null is a deliberate invalid runtime input.
      expect(isValidDictionaryData(null)).toBe(false);
      // @ts-expect-error undefined is a deliberate invalid runtime input.
      expect(isValidDictionaryData(undefined)).toBe(false);
      // @ts-expect-error A string is a deliberate invalid runtime input.
      expect(isValidDictionaryData('string')).toBe(false);
      // @ts-expect-error A number is a deliberate invalid runtime input.
      expect(isValidDictionaryData(123)).toBe(false);
      // @ts-expect-error An object is a deliberate invalid runtime input.
      expect(isValidDictionaryData({})).toBe(false);
    });

    it('rejects array with entries missing both text and partOfSpeech', () => {
      const invalidData = [
        {
          someOtherField: 'value'
        }
      ];

      // @ts-expect-error An unknown definition field is a deliberate invalid runtime input.
      expect(isValidDictionaryData(invalidData)).toBe(false);
    });

    it('rejects array with entries having empty text and partOfSpeech', () => {
      const invalidData = [
        {
          text: '',
          partOfSpeech: '  '
        }
      ];

      // @ts-expect-error Noncanonical part of speech is a deliberate invalid runtime input.
      expect(isValidDictionaryData(invalidData)).toBe(false);
    });

    it('refuses entries whose text or partOfSpeech is not a string', () => {
      // @ts-expect-error Numeric text is a deliberate invalid runtime input.
      expect(isValidDictionaryData([{ text: 123, partOfSpeech: 'noun' }])).toBe(false);
      // @ts-expect-error Numeric part of speech is a deliberate invalid runtime input.
      expect(isValidDictionaryData([{ text: 'Valid text', partOfSpeech: 456 }])).toBe(false);
    });

    it('accepts mixed array where at least one entry is displayable', () => {
      const mixedData: DictionaryDefinition[] = [
        {
          text: 'Text without a part of speech'
        },
        {
          text: 'Valid definition',
          partOfSpeech: 'noun'
        }
      ];

      expect(isValidDictionaryData(mixedData)).toBe(true);
    });

    it('refuses a noncanonical part of speech with whitespace', () => {
      const invalidData = [
        {
          text: '  Valid text with whitespace  ',
          partOfSpeech: '  noun  '
        }
      ];

      // @ts-expect-error Noncanonical part of speech is a deliberate invalid runtime input.
      expect(isValidDictionaryData(invalidData)).toBe(false);
    });

    it('rejects array with only whitespace in text and partOfSpeech', () => {
      const invalidData = [
        {
          text: '   ',
          partOfSpeech: '\t\n  '
        }
      ];

      // @ts-expect-error Noncanonical part of speech is a deliberate invalid runtime input.
      expect(isValidDictionaryData(invalidData)).toBe(false);
    });
  });

  describe('consumers of the displayability rule agree', () => {
    const corpus: WordData[] = [sadLike, pbjLike, textOnly, emptyText];

    it.each([
      { fixture: sadLike, partsOfSpeech: ['adjective'], text: requireValue(sadLike.data[0]).text },
      { fixture: pbjLike, partsOfSpeech: ['abbreviation'], text: 'peanut butter and jelly' },
      { fixture: textOnly, partsOfSpeech: [], text: null },
      { fixture: emptyText, partsOfSpeech: [], text: null },
    ])('for $fixture.word', ({ fixture, partsOfSpeech, text }) => {
      const displayed = partsOfSpeech.length > 0;
      const [primary = null] = partsOfSpeech;

      expect(getWordSenses(fixture).map(sense => sense.partOfSpeech)).toEqual(partsOfSpeech);
      expect(findValidDefinition(fixture.data)).toEqual(displayed ? { text, partOfSpeech: primary } : null);
      expect(getAvailablePartsOfSpeech([fixture])).toEqual(partsOfSpeech);
      expect(isValidDictionaryData(fixture.data)).toBe(displayed);

      // Grouping and filtering run over the whole corpus, so a hidden
      // abbreviation would show up as membership of the wrong bucket.
      const groups = groupWordsByPartOfSpeechPure(corpus);
      const memberships = Object.keys(groups).filter(pos => requireValue(groups[pos]).includes(fixture));
      expect(memberships).toEqual(partsOfSpeech);
      expect(['abbreviation', 'adjective', 'noun'].filter(pos => getWordsByPartOfSpeechPure(pos, corpus).includes(fixture)))
        .toEqual(partsOfSpeech);
    });
  });

  describe('getWordSenses', () => {
    const reading: WordData = {
      word: 'reading',
      date: '20250101',
      adapter: 'merriam-webster',
      data: [
        { id: 'reading', partOfSpeech: 'noun', text: 'the act of reading' },
        { id: 'reading', partOfSpeech: 'verb', text: 'to read aloud' },
        { id: 'reading desk', partOfSpeech: 'noun', text: 'a desk for reading' },
        { id: 'reading', text: 'no part of speech' },
      ],
    };

    it('returns every valid headword sense and excludes compound entries', () => {
      const senses = getWordSenses(reading);
      expect(senses).toEqual([
        { partOfSpeech: 'noun', segments: [{ type: 'text', text: 'the act of reading' }], examples: [] },
        { partOfSpeech: 'verb', segments: [{ type: 'text', text: 'to read aloud' }], examples: [] },
      ]);
    });

    it('shows stored cross-reference ranges as links', () => {
      const word: WordData = {
        word: 'amblypygi',
        date: '20230106',
        adapter: 'wordnik',
        data: [
          {
            partOfSpeech: 'noun',
            text: 'A taxonomic order of arachnids.',
            references: [{ start: 12, end: 17, url: 'https://www.wordnik.com/words/order' }],
          },
        ],
      };
      const segments = [
        { type: 'text', text: 'A taxonomic ' },
        { type: 'reference', text: 'order', url: 'https://www.wordnik.com/words/order' },
        { type: 'text', text: ' of arachnids.' },
      ];

      expect(getWordSenses(word).map(sense => sense.segments)).toEqual([segments]);
    });

    it('falls back to the single best definition when the id filter matches nothing', () => {
      const word: WordData = {
        word: 'xyz',
        date: '20250101',
        adapter: 'wordnik',
        data: [{ id: 'unrelated', partOfSpeech: 'noun', text: 'a definition' }],
      };
      expect(getWordSenses(word)).toEqual([{ partOfSpeech: 'noun', segments: [{ type: 'text', text: 'a definition' }], examples: [] }]);
    });

    it('returns an empty array for missing or invalid data', () => {
      expect(getWordSenses({ word: 'x', date: '1', adapter: 'a', data: [] })).toEqual([]);
      // @ts-expect-error null is a deliberate invalid runtime input.
      expect(getWordSenses(null)).toEqual([]);
    });

    it('attaches per-sense examples: capped, de-duplicated across slides, compounds excluded', () => {
      const word: WordData = {
        word: 'reading',
        date: '20250101',
        adapter: 'merriam-webster',
        data: [
          // 'she loves reading.' is a case-insensitive dup; the 4th example exceeds the cap.
          { id: 'reading', partOfSpeech: 'noun', text: 'a', examples: ['She loves reading.', 'she loves reading.', 'A quiet reading.', 'Reading is fun.'] },
          // 'She loves reading.' was already claimed by the noun slide, so only the new one shows.
          { id: 'reading', partOfSpeech: 'verb', text: 'b', examples: ['She loves reading.', 'Keep reading.'] },
          { id: 'reading desk', partOfSpeech: 'noun', text: 'c', examples: ['Compound example, excluded.'] },
        ],
      };
      const senses = getWordSenses(word);
      expect(senses).toHaveLength(2);
      expect(requireValue(senses[0]).examples).toEqual(['She loves reading.', 'A quiet reading.']);
      expect(requireValue(senses[1]).examples).toEqual(['Keep reading.']);
      expect(senses.flatMap(sense => sense.examples)).not.toContain('Compound example, excluded.');
    });
  });

  describe('corpusRelationMatch', () => {
    const corpus = new Set(['joy', 'knowledge', 'reading', 'the', 'they', 'day']);

    it('returns the lowercased headword on a case-insensitive exact match', () => {
      expect(corpusRelationMatch('Joy', corpus)).toBe('joy');
    });

    it('resolves a term that is a corpus headword plus a derivational suffix', () => {
      expect(corpusRelationMatch('joyful', corpus)).toBe('joy');
      expect(corpusRelationMatch('knowledgeability', corpus)).toBe('knowledge');
    });

    it('resolves a term whose derivational form is the corpus headword', () => {
      // `read` -> corpus headword `reading` (read + -ing)
      expect(corpusRelationMatch('read', corpus)).toBe('reading');
    });

    it('prefers an exact match over a derivational one so `they` never becomes `the`', () => {
      expect(corpusRelationMatch('they', corpus)).toBe('they');
    });

    it('rejects a derivational base shorter than three characters', () => {
      // `an` + nothing recognized, and no 2-char base may seed a suffix match
      expect(corpusRelationMatch('any', new Set(['an']))).toBeNull();
      expect(corpusRelationMatch('ofs', new Set(['of']))).toBeNull();
    });

    it('returns null when nothing matches', () => {
      expect(corpusRelationMatch('pizzicato', corpus)).toBeNull();
    });
  });

  describe('corpusRelations', () => {
    const corpus = new Set(['joy', 'happy', 'knowledge']);

    it('maps terms to corpus headwords, dropping non-matches', () => {
      expect(corpusRelations('happy', ['joyful', 'pizzicato', 'knowledge'], corpus))
        .toEqual(['joy', 'knowledge']);
    });

    it('drops self-links back to the source word', () => {
      // joy page lists its own derivational forms; they must not link to joy
      expect(corpusRelations('joy', ['joyful', 'joyous'], corpus)).toEqual([]);
    });

    it('dedupes when several terms resolve to the same headword', () => {
      expect(corpusRelations('happy', ['joyful', 'joyous'], corpus)).toEqual(['joy']);
    });
  });

  describe('mergeEnrichment', () => {
    const stored = {
      pronunciation: 'spēd',
      audio: 'https://example.com/speed.mp3',
      etymology: 'Old English spēd',
      synonyms: ['velocity'],
      antonyms: ['slowness'],
      related: ['motion'],
    };

    it('keeps every stored field when the refresh supplies none', () => {
      expect(mergeEnrichment(stored, undefined)).toEqual(stored);
      expect(mergeEnrichment(stored, {})).toEqual(stored);
    });

    it('replaces only the fields the refresh supplies', () => {
      const merged = mergeEnrichment(stored, { etymology: 'Middle English spede', synonyms: ['pace', 'rate'] });

      expect(merged).toEqual({
        ...stored,
        etymology: 'Middle English spede',
        synonyms: ['pace', 'rate'],
      });
    });

    it('treats empty strings and empty lists as not supplied', () => {
      expect(mergeEnrichment(stored, { pronunciation: '', antonyms: [] })).toEqual(stored);
    });

    it('returns the refresh unchanged when nothing was stored', () => {
      expect(mergeEnrichment(undefined, { pronunciation: 'spēd' })).toEqual({ pronunciation: 'spēd' });
    });

    it('returns undefined when neither side has anything, so enrichment stays absent', () => {
      expect(mergeEnrichment(undefined, undefined)).toBeUndefined();
      expect(mergeEnrichment({}, { synonyms: [] })).toBeUndefined();
    });

    it('writes fields in one fixed order regardless of which side supplied them', () => {
      const merged = mergeEnrichment({ related: ['motion'], pronunciation: 'spēd' }, { synonyms: ['pace'], audio: 'a.mp3' });

      expect(Object.keys(requireValue(merged))).toEqual(['pronunciation', 'audio', 'synonyms', 'related']);
    });
  });

});

describe('homepage selection', () => {
  const later = makeWord('later', '20260101');
  const current = makeWord('current', '20250101');
  const older = makeWord('older', '20241201');
  const oldest = makeWord('oldest', '20241101');
  const words = [later, current, older, oldest];

  it('picks the newest word dated on or before today', () => {
    expect(findCurrentWord(words, '20250615')).toBe(current);
    expect(findCurrentWord(words, '20250101')).toBe(current);
  });

  it('falls back to the oldest word when every word is dated later', () => {
    expect(findCurrentWord(words, '20240101')).toBe(oldest);
    expect(findCurrentWord([], '20250101')).toBeNull();
  });

  it('lists only words dated before the current word, newest first', () => {
    expect(getPreviousWords(words, current, 4)).toEqual([older, oldest]);
    expect(getPreviousWords(words, current, 1)).toEqual([older]);
    expect(getPreviousWords(words, null, 4)).toEqual([]);
  });
});
