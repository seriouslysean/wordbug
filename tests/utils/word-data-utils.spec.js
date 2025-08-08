import {
 afterEach,beforeEach, describe, expect, it, vi,
} from 'vitest';

import { isValidDictionaryData } from '~utils/word-validation';
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
} from '~utils-client/word-data-utils';
import {
  getAvailableLengths,
  getAvailableMonths,
  getAvailableYears,
  getWordsByYear,
} from '~utils/word-data-utils';

describe('word-data-utils', () => {
  const mockWordData = [
    { word: 'current', date: '20250110', data: [{ text: 'Current word', partOfSpeech: 'adjective' }] },
    { word: 'yesterday', date: '20250109', data: [{ text: 'Yesterday word', partOfSpeech: 'noun' }] },
    { word: 'older', date: '20250105', data: [{ text: 'Older word', partOfSpeech: 'adjective' }] },
    { word: 'year2024', date: '20241225', data: [{ text: '2024 word', partOfSpeech: 'noun' }] },
    { word: 'year2023', date: '20231201', data: [{ text: '2023 word', partOfSpeech: 'verb' }] },
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
      const [first, second, third, fourth] = result;

      expect(result).toHaveLength(4);
      expect(first.word).toBe('yesterday');
      expect(second.word).toBe('older');
      expect(third.word).toBe('year2024');
      expect(fourth.word).toBe('year2023');
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
      const result = getWordByDate('20250101', mockWordData);
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
      expect(result.previousWord).toBeNull(); // no older word
      expect(result.nextWord.word).toBe('year2024');
    });

    it('returns null for non-existent date', () => {
      const result = getAdjacentWords('20250101', mockWordData);
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
      expect(result2025).toHaveLength(3);
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
      expect(result).toHaveLength(3);
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
      expect(result['2025']).toHaveLength(3);
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
      expect(result['january']).toHaveLength(3);
    });

    it('returns empty object when no words match the year', () => {
      const result = groupWordsByMonth('2020', mockWordData);
      expect(result).toEqual({});
    });

    it('groups words with different months correctly', () => {
      const extendedData = [...mockWordData, { word: 'feb', date: '20250201', data: [] }];
      const result = groupWordsByMonth('2025', extendedData);
      expect(Object.keys(result)).toEqual(expect.arrayContaining(['january', 'february']));
      expect(result['january']).toHaveLength(3);
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
      expect(result).toEqual([5, 7, 8, 9]);
    });

    it('filters words by specified length', () => {
      const result = getWordsByLength(8, mockWordData);
      expect(result).toHaveLength(2);
      expect(result.every(w => w.word.length === 8)).toBe(true);
    });

    it('groups words by length', () => {
      const result = groupWordsByLength(mockWordData);
      expect(Object.keys(result).map(Number).sort((a, b) => a - b)).toEqual([5, 7, 8, 9]);
      expect(result[8]).toHaveLength(2);
    });
  });
});