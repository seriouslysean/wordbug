import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { isValidDictionaryData } from '#utils/word-validation';
import {
  getAdjacentWords,
  getCurrentWord,
  getPastWords,
  getWordByDate,
  getWordDetails,
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
  normalizePartOfSpeech,
  findValidDefinition,
} from '#utils/word-data-utils';
import {
  extractWordDefinition,
} from '#astro-utils/word-data-utils';

describe('word-data-utils', () => {
  // Mock data sorted by descending date (newest first) like real getWordsFromCollection
  const mockWordData = [
    { word: 'current', date: '20250110', data: [{ text: 'Current word', partOfSpeech: 'adjective' }] },
    { word: 'yesterday', date: '20250109', data: [{ text: 'Yesterday word', partOfSpeech: 'noun' }] },
    { word: 'older', date: '20250105', data: [{ text: 'Older word', partOfSpeech: 'adjective' }] },
    { word: 'zebra', date: '20250103', data: [{ text: 'Zebra word', partOfSpeech: 'noun' }] },
    { word: 'banana', date: '20250102', data: [{ text: 'Banana word', partOfSpeech: 'noun' }] },
    { word: 'apple', date: '20250101', data: [{ text: 'Apple word', partOfSpeech: 'noun' }] },
    { word: 'year2024', date: '20241225', data: [{ text: '2024 word', partOfSpeech: 'noun' }] },
    { word: 'year2023', date: '20231201', data: [{ text: '2023 word', partOfSpeech: 'verb' }] },
  ];

  // Additional mock data for part-of-speech tests
  const mockWordDataWithComplexPartOfSpeech = [
    { word: 'run', date: '20250120', data: [
      { text: 'To move swiftly', partOfSpeech: 'intransitive verb' },
      { text: 'A distance run', partOfSpeech: 'noun' }
    ]},
    { word: 'beautiful', date: '20250119', data: [{ text: 'Pleasing to look at', partOfSpeech: 'adjective' }] },
    { word: 'quickly', date: '20250118', data: [{ text: 'In a quick manner', partOfSpeech: 'adverb' }] },
    { word: 'help', date: '20250117', data: [{ text: 'To assist', partOfSpeech: 'transitive verb' }] },
    { word: 'indices', date: '20250114', data: [{ text: 'Plural of index', partOfSpeech: 'noun plural' }] },
    { word: 'the', date: '20250116', data: [{ text: 'Definite article', partOfSpeech: 'definite article' }] },
    { word: 'have', date: '20250115', data: [{ text: 'Auxiliary verb', partOfSpeech: 'auxiliary verb' }] },
  ];


  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isValidDictionaryData', () => {
    it('validates data with text content', () => {
      const validData = [{ text: 'A valid definition', partOfSpeech: 'noun' }];
      expect(isValidDictionaryData(validData)).toBe(true);
    });

    it('validates data with only part of speech', () => {
      const validData = [{ partOfSpeech: 'noun' }];
      expect(isValidDictionaryData(validData)).toBe(true);
    });

    it('validates data with only text', () => {
      const validData = [{ text: 'A definition without part of speech' }];
      expect(isValidDictionaryData(validData)).toBe(true);
    });

    it('rejects empty array', () => {
      expect(isValidDictionaryData([])).toBe(false);
    });

    it('rejects null/undefined', () => {
      expect(isValidDictionaryData(null)).toBe(false);
      expect(isValidDictionaryData(undefined)).toBe(false);
    });

    it('rejects non-array input', () => {
      expect(isValidDictionaryData('not an array')).toBe(false);
      expect(isValidDictionaryData({})).toBe(false);
    });

    it('rejects data with no meaningful content', () => {
      const invalidData = [{ id: '123', sourceDictionary: 'test' }]; // no text or partOfSpeech
      expect(isValidDictionaryData(invalidData)).toBe(false);
    });

    it('accepts mixed data if at least one entry is valid', () => {
      const mixedData = [
        { id: '123' }, // invalid
        { text: 'Valid definition' }, // valid
      ];
      expect(isValidDictionaryData(mixedData)).toBe(true);
    });
  });

  describe('getCurrentWord', () => {
    it('returns most recent word not after today', () => {
      const result = getCurrentWord(mockWordData);
      expect(result.word).toBe('current');
      expect(result.date).toBe('20250110');
    });

    it('returns first word when no words match date criteria', () => {
      const futureWords = [
        { word: 'future', date: '20250115', data: [] }, // future date
      ];
      const result = getCurrentWord(futureWords);
      expect(result.word).toBe('future');
    });

    it('returns null when no words available', () => {
      const result = getCurrentWord([]);
      expect(result).toBeNull();
    });
  });

  describe('getPastWords', () => {
    it('returns words before given date', () => {
      const result = getPastWords('20250110', mockWordData);
      const [first, second, third, fourth, fifth] = result;

      expect(result).toHaveLength(5);
      expect(first.word).toBe('yesterday');
      expect(second.word).toBe('older');
      expect(third.word).toBe('zebra'); // sorted order: current, yesterday, older, zebra, banana
      expect(fourth.word).toBe('banana');
      expect(fifth.word).toBe('apple');
    });

    it('limits to 5 words', () => {
      const manyWords = Array.from({ length: 10 }, (_, i) => ({
        word: `word${i}`,
        date: `2025010${9 - i}`, // descending dates
        data: [],
      }));
      const result = getPastWords('20250110', manyWords);
      expect(result).toHaveLength(5);
    });

    it('returns empty array for empty date', () => {
      expect(getPastWords('', mockWordData)).toEqual([]);
      expect(getPastWords(null, mockWordData)).toEqual([]);
    });
  });

  describe('getWordByDate', () => {
    it('finds word by exact date match', () => {
      const result = getWordByDate('20250109', mockWordData);
      expect(result.word).toBe('yesterday');
    });

    it('returns null for non-existent date', () => {
      const result = getWordByDate('20250199', mockWordData); // use non-existent date
      expect(result).toBeNull();
    });

    it('returns null for empty date', () => {
      expect(getWordByDate('', mockWordData)).toBeNull();
      expect(getWordByDate(null, mockWordData)).toBeNull();
    });
  });

  describe('getAdjacentWords', () => {
    it('returns previous and next words', () => {
      const result = getAdjacentWords('20250109', mockWordData);
      expect(result.previousWord.word).toBe('older'); // older date
      expect(result.nextWord.word).toBe('current'); // newer date
    });

    it('handles word at beginning of array', () => {
      const result = getAdjacentWords('20250110', mockWordData);
      expect(result.previousWord.word).toBe('yesterday');
      expect(result.nextWord).toBeNull(); // no newer word
    });

    it('handles word at end of array', () => {
      const result = getAdjacentWords('20231201', mockWordData);
      expect(result.previousWord).toBeNull(); // year2023 is last (oldest), no older word
      expect(result.nextWord.word).toBe('year2024'); // next newer word
    });

    it('returns null for non-existent date', () => {
      const result = getAdjacentWords('20250199', mockWordData); // use non-existent date
      expect(result.previousWord).toBeNull();
      expect(result.nextWord).toBeNull();
    });
  });

  describe('getWordDetails', () => {
    it('extracts word details using adapter', () => {
      const result = getWordDetails(null);
      expect(result).toEqual({ partOfSpeech: '', definition: '', meta: null });
    });

    it('handles missing word data', () => {
      const result = getWordDetails(null);
      expect(result).toEqual({ partOfSpeech: '', definition: '', meta: null });
    });
  });

  describe('getWordsByYear', () => {
    it('filters words by year', () => {
      const result2025 = getWordsByYear('2025', mockWordData);
      expect(result2025).toHaveLength(6); // current, yesterday, older, apple, banana, zebra
      expect(result2025.every(w => w.date.startsWith('2025'))).toBe(true);

      const result2024 = getWordsByYear('2024', mockWordData);
      expect(result2024).toHaveLength(1);
      expect(result2024[0].word).toBe('year2024');
    });

    it('returns empty array for non-existent year', () => {
      const result = getWordsByYear('2020', mockWordData);
      expect(result).toEqual([]);
    });
  });

  describe('getWordsByMonth', () => {
    it('filters words by month within a year', () => {
      const result = getWordsByMonth('2025', '01', mockWordData);
      expect(result).toHaveLength(6); // all 2025 words are in January
      expect(result.every(w => w.date.startsWith('202501'))).toBe(true);

      const result2024 = getWordsByMonth('2024', '12', mockWordData);
      expect(result2024).toHaveLength(1);
      expect(result2024[0].word).toBe('year2024');
    });

    it('returns empty array for non-existent month', () => {
      const result = getWordsByMonth('2025', '02', mockWordData);
      expect(result).toEqual([]);
    });
  });

  describe('getAvailableMonths', () => {
    it('returns unique months for a year in ascending order', () => {
      const extended = [...mockWordData, { word: 'feb', date: '20250201', data: [] }];
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
      const extendedData = [...mockWordData, { word: 'feb', date: '20250201', data: [] }];
      const result = groupWordsByMonth('2025', extendedData);
      expect(Object.keys(result)).toEqual(expect.arrayContaining(['january', 'february']));
      expect(result['january']).toHaveLength(6);
      expect(result['february']).toHaveLength(1);
    });

    it('uses month slugs as keys', () => {
      const result = groupWordsByMonth('2025', mockWordData);
      expect(Object.keys(result)).toEqual(['january']); // lowercase month name
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
      expect(result).toEqual([5, 6, 7, 8, 9]); // apple=5, banana/zebra=6, current=7, yesterday=8, older=5, year2024/year2023=8
    });

    it('filters words by specified length', () => {
      const result = getWordsByLength(8, mockWordData);
      expect(result).toHaveLength(2);
      expect(result.every(w => w.word.length === 8)).toBe(true);
    });

    it('groups words by length', () => {
      const result = groupWordsByLength(mockWordData);
      expect(Object.keys(result).map(Number).sort((a, b) => a - b)).toEqual([5, 6, 7, 8, 9]);
      expect(result[8]).toHaveLength(2); // year2024=8, year2023=8 (yesterday=9)
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
      expect(resultA[0].word).toBe('apple');
      
      const resultY = getWordsByLetter('Y', mockWordData); // test case insensitive
      expect(resultY).toHaveLength(3);
      expect(resultY.map(w => w.word).sort()).toEqual(['year2023', 'year2024', 'yesterday']);
    });

    it('groups words by starting letter', () => {
      const result = groupWordsByLetter(mockWordData);
      
      expect(result['a']).toHaveLength(1);
      expect(result['a'][0].word).toBe('apple');
      
      expect(result['b']).toHaveLength(1);
      expect(result['b'][0].word).toBe('banana');
      
      expect(result['y']).toHaveLength(3);
      expect(result['y'].map(w => w.word)).toEqual(['year2023', 'year2024', 'yesterday']);
      
      expect(result['z']).toHaveLength(1);
      expect(result['z'][0].word).toBe('zebra');
    });

    it('sorts words within letter groups alphabetically', () => {
      const result = groupWordsByLetter(mockWordData);
      const yWords = result['y'];
      expect(yWords[0].word).toBe('year2023'); // alphabetically first
      expect(yWords[1].word).toBe('year2024');
      expect(yWords[2].word).toBe('yesterday');
    });

    it('ignores non-alphabetic starting characters', () => {
      const dataWithNumbers = [...mockWordData, 
        { word: '123number', date: '20250201', data: [] },
        { word: '!exclamation', date: '20250202', data: [] }
      ];
      
      const letters = getAvailableLetters(dataWithNumbers);
      expect(letters).toEqual(['a', 'b', 'c', 'o', 'y', 'z']); // no numbers or symbols
      
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
      const definitions = [
        { text: 'No part of speech' },
        { text: 'Valid definition', partOfSpeech: 'noun' },
        { text: 'Another valid', partOfSpeech: 'verb' },
      ];
      const result = findValidDefinition(definitions);
      expect(result).toEqual({ text: 'Valid definition', partOfSpeech: 'noun' });
    });

    it('handles text as array', () => {
      const definitions = [
        { text: ['Sea of', 'An enclosed arm...'] }, // no partOfSpeech
        { text: 'Valid definition', partOfSpeech: 'proper noun' },
      ];
      const result = findValidDefinition(definitions);
      expect(result).toEqual({ text: 'Valid definition', partOfSpeech: 'proper noun' });
    });

    it('joins array text when partOfSpeech present', () => {
      const definitions = [
        { text: ['Part one', 'Part two'], partOfSpeech: 'noun' },
      ];
      const result = findValidDefinition(definitions);
      expect(result).toEqual({ text: 'Part one Part two', partOfSpeech: 'noun' });
    });

    it('returns null for empty array', () => {
      expect(findValidDefinition([])).toBeNull();
    });

    it('returns null when no definitions have partOfSpeech', () => {
      const definitions = [
        { text: 'No part of speech' },
        { text: 'Another without' },
      ];
      expect(findValidDefinition(definitions)).toBeNull();
    });

    it('skips empty text values', () => {
      const definitions = [
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
      const wordData = {
        word: 'test',
        date: '20250101',
        data: [
          { text: 'No part of speech' },
          { text: 'Valid definition', partOfSpeech: 'noun' },
        ],
      };
      const result = extractWordDefinition(wordData);
      expect(result).toEqual({ definition: 'Valid definition', partOfSpeech: 'noun' });
    });

    it('returns empty strings when no valid definition found', () => {
      const wordData = {
        word: 'test',
        date: '20250101',
        data: [{ text: 'No part of speech' }],
      };
      const result = extractWordDefinition(wordData);
      expect(result).toEqual({ definition: '', partOfSpeech: '' });
    });
  });

  describe('part-of-speech utilities', () => {
    it('normalizes basic parts of speech', () => {
      expect(normalizePartOfSpeech('noun')).toBe('noun');
      expect(normalizePartOfSpeech('Adjective')).toBe('adjective');
      expect(normalizePartOfSpeech('VERB  ')).toBe('verb');
    });

    it('normalizes verb variations', () => {
      expect(normalizePartOfSpeech('transitive verb')).toBe('verb');
      expect(normalizePartOfSpeech('intransitive verb')).toBe('verb');
      expect(normalizePartOfSpeech('auxiliary verb')).toBe('verb');
      expect(normalizePartOfSpeech('phrasal verb')).toBe('verb');
    });

    it('normalizes noun variations', () => {
      expect(normalizePartOfSpeech('proper noun')).toBe('noun');
      expect(normalizePartOfSpeech('noun plural')).toBe('noun');
    });

    it('normalizes article variations', () => {
      expect(normalizePartOfSpeech('definite article')).toBe('article');
      expect(normalizePartOfSpeech('definite article.')).toBe('article'); // with trailing period
    });

    it('removes trailing punctuation', () => {
      expect(normalizePartOfSpeech('noun.')).toBe('noun');
      expect(normalizePartOfSpeech('verb!')).toBe('verb');
      expect(normalizePartOfSpeech('adjective,')).toBe('adjective');
    });

    it('returns sorted unique parts of speech', () => {
      const result = getAvailablePartsOfSpeech(mockWordDataWithComplexPartOfSpeech);
      expect(result).toEqual(['adjective', 'adverb', 'article', 'noun', 'verb']);
    });

    it('filters words by part of speech', () => {
      const nouns = getWordsByPartOfSpeech('noun', mockWordDataWithComplexPartOfSpeech);
      expect(nouns).toHaveLength(2); // 'run' and 'indices' normalize to noun
      expect(nouns.map(w => w.word).sort()).toEqual(['indices', 'run']);

      const verbs = getWordsByPartOfSpeech('verb', mockWordDataWithComplexPartOfSpeech);
      expect(verbs).toHaveLength(3); // 'run', 'help', 'have' (normalized from various verb types)
      expect(verbs.map(w => w.word).sort()).toEqual(['have', 'help', 'run']);
    });

    it('groups words by part of speech', () => {
      const result = groupWordsByPartOfSpeech(mockWordDataWithComplexPartOfSpeech);
      
      expect(result['noun']).toHaveLength(2);
      expect(result['noun'].map(w => w.word)).toEqual(['indices', 'run']);
      
      expect(result['verb']).toHaveLength(3);
      expect(result['verb'].map(w => w.word)).toEqual(['have', 'help', 'run']); // sorted alphabetically
      
      expect(result['adjective']).toHaveLength(1);
      expect(result['adjective'][0].word).toBe('beautiful');
      
      expect(result['adverb']).toHaveLength(1);
      expect(result['adverb'][0].word).toBe('quickly');
      
      expect(result['article']).toHaveLength(1);
      expect(result['article'][0].word).toBe('the');
    });

    it('avoids duplicate words in groups when word has multiple definitions', () => {
      const result = groupWordsByPartOfSpeech(mockWordDataWithComplexPartOfSpeech);
      
      // 'run' appears in both noun and verb groups but only once in each
      expect(result['noun'].filter(w => w.word === 'run')).toHaveLength(1);
      expect(result['verb'].filter(w => w.word === 'run')).toHaveLength(1);
    });

    it('handles words with no part of speech', () => {
      const dataWithMissingPartOfSpeech = [
        { word: 'test', date: '20250120', data: [{ text: 'Test definition' }] },
        { word: 'valid', date: '20250119', data: [{ text: 'Valid definition', partOfSpeech: 'adjective' }] }
      ];
      
      const result = getAvailablePartsOfSpeech(dataWithMissingPartOfSpeech);
      expect(result).toEqual(['adjective']);
      
      const grouped = groupWordsByPartOfSpeech(dataWithMissingPartOfSpeech);
      expect(grouped['adjective']).toHaveLength(1);
      expect(grouped['adjective'][0].word).toBe('valid');
    });

    it('handles empty arrays', () => {
      expect(getAvailablePartsOfSpeech([])).toEqual([]);
      expect(getWordsByPartOfSpeech('noun', [])).toEqual([]);
      expect(groupWordsByPartOfSpeech([])).toEqual({});
    });
  });
});
