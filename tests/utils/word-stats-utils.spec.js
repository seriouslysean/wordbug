import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  findWordDate,
  getAntiStreakStats,
  getChronologicalMilestones,
  getCurrentStreakStats,
  getCurrentStreakWords,
  getLetterPatternStats,
  getLetterStats,
  getLetterStatsFromFrequency,
  getLetterTypeStats,
  getLongestStreakWords,
  getPatternStats,
  getSyllableStats,
  getWordEndingStats,
  getWordStats,
} from '#utils/word-stats-utils';
import { areConsecutiveDays, dateToYYYYMMDD } from '#utils/date-utils';

const sampleWords = [
  { word: 'hello', date: '20240101' },
  { word: 'world', date: '20240102' },
  { word: 'abcd', date: '20240103' },
  { word: 'programming', date: '20240104' },
  { word: 'testing', date: '20240105' },
  { word: 'occasional', date: '20240106' },
  { word: 'deed', date: '20240107' }, // palindrome
  { word: 'a', date: '20240108' }, // single vowel
  { word: 'by', date: '20240109' }, // consonants only  
  { word: 'seeing', date: '20240110' }, // double letters + ending
  { word: 'worked', date: '20240111' }, // ends with -ed
];

const emptyWords = [];

describe('word-stats-utils', () => {
  describe('getLetterStats', () => {
    it('returns most and least common letters with frequency', () => {
      const stats = getLetterStats(sampleWords);
      
      expect(stats.mostCommon).toBeDefined();
      expect(stats.leastCommon).toBeDefined();
      expect(stats.frequency).toBeDefined();
      expect(typeof stats.frequency).toBe('object');
    });

    it('handles empty word array', () => {
      const stats = getLetterStats(emptyWords);
      
      expect(stats.mostCommon).toBe('');
      expect(stats.leastCommon).toBe('');
      expect(stats.frequency).toEqual({});
    });
  });

  describe('getLetterPatternStats', () => {
    it('identifies various letter patterns', () => {
      const patterns = getLetterPatternStats(sampleWords);

      expect(patterns.startEndSame).toContainEqual({ word: 'deed', date: '20240107' });
      expect(patterns.doubleLetters).toContainEqual({ word: 'hello', date: '20240101' });
      expect(patterns.doubleLetters).toContainEqual({ word: 'programming', date: '20240104' });
      expect(patterns.doubleLetters).toContainEqual({ word: 'seeing', date: '20240110' });
      expect(patterns.alphabetical).toContainEqual({ word: 'abcd', date: '20240103' });
      expect(patterns.palindromes).toContainEqual({ word: 'deed', date: '20240107' });
      expect(patterns.palindromes).toContainEqual({ word: 'a', date: '20240108' });
    });

    it('handles empty word array', () => {
      const patterns = getLetterPatternStats(emptyWords);

      expect(patterns.startEndSame).toEqual([]);
      expect(patterns.doubleLetters).toEqual([]);
      expect(patterns.tripleLetters).toEqual([]);
      expect(patterns.alphabetical).toEqual([]);
      expect(patterns.palindromes).toEqual([]);
    });
  });

  describe('getWordEndingStats', () => {
    it('categorizes words by endings', () => {
      const endings = getWordEndingStats(sampleWords);

      expect(endings.ing).toContainEqual({ word: 'programming', date: '20240104' });
      expect(endings.ing).toContainEqual({ word: 'testing', date: '20240105' });
      expect(endings.ing).toContainEqual({ word: 'seeing', date: '20240110' });
      expect(endings.ed).toContainEqual({ word: 'worked', date: '20240111' });
      expect(Array.isArray(endings.ly)).toBe(true);
      expect(Array.isArray(endings.ness)).toBe(true);
      expect(Array.isArray(endings.ful)).toBe(true);
      expect(Array.isArray(endings.less)).toBe(true);
    });

    it('handles empty word array', () => {
      const endings = getWordEndingStats(emptyWords);

      expect(endings.ing).toEqual([]);
      expect(endings.ed).toEqual([]);
      expect(endings.ly).toEqual([]);
      expect(endings.ness).toEqual([]);
      expect(endings.ful).toEqual([]);
      expect(endings.less).toEqual([]);
    });
  });

  describe('getPatternStats', () => {
    it('finds special pattern words', () => {
      const patterns = getPatternStats(sampleWords);

      expect(patterns.allVowels).toContainEqual({ word: 'a', date: '20240108' });
      expect(patterns.allConsonants).toContainEqual({ word: 'by', date: '20240109' });
      expect(patterns.palindromes).toContainEqual({ word: 'deed', date: '20240107' });
      expect(patterns.palindromes).toContainEqual({ word: 'a', date: '20240108' });
    });

    it('handles empty word array', () => {
      const patterns = getPatternStats(emptyWords);

      expect(patterns.allVowels).toEqual([]);
      expect(patterns.allConsonants).toEqual([]);
      expect(patterns.palindromes).toEqual([]);
    });
  });

  describe('areConsecutiveDays', () => {
    it('identifies consecutive dates', () => {
      expect(areConsecutiveDays('20240101', '20240102')).toBe(true);
      expect(areConsecutiveDays('20240101', '20240103')).toBe(false);
      expect(areConsecutiveDays('20241231', '20250101')).toBe(true);
    });

    it('handles invalid dates', () => {
      expect(areConsecutiveDays('invalid', '20240102')).toBe(false);
      expect(areConsecutiveDays('20240101', 'invalid')).toBe(false);
    });
  });

  describe('getChronologicalMilestones', () => {
    it('identifies milestone words', () => {
      const milestones = getChronologicalMilestones(sampleWords);
      
      expect(Array.isArray(milestones)).toBe(true);
      expect(milestones.length).toBeGreaterThan(0);
      
      // Should always include first word as milestone 1
      const firstMilestone = milestones.find(m => m.milestone === 1);
      expect(firstMilestone).toBeDefined();
      expect(firstMilestone.word).toEqual({ word: 'hello', date: '20240101' });
      
      // Check milestone structure
      milestones.forEach(milestone => {
        expect(milestone).toHaveProperty('milestone');
        expect(milestone).toHaveProperty('word');
        expect(typeof milestone.milestone).toBe('number');
        expect(milestone.word).toHaveProperty('word');
        expect(milestone.word).toHaveProperty('date');
      });
    });

    it('handles empty word array', () => {
      const milestones = getChronologicalMilestones(emptyWords);
      expect(milestones).toEqual([]);
    });

    it('includes expected milestones for larger arrays', () => {
      // Create array with 200 words to test 100-word milestones
      const manyWords = Array.from({ length: 200 }, (_, i) => ({
        word: `word${i + 1}`,
        date: `2024${String(Math.floor(i / 31) + 1).padStart(2, '0')}${String((i % 31) + 1).padStart(2, '0')}`
      }));
      
      const milestones = getChronologicalMilestones(manyWords);
      
      expect(milestones.find(m => m.milestone === 1)).toBeDefined();
      expect(milestones.find(m => m.milestone === 25)).toBeDefined();
      expect(milestones.find(m => m.milestone === 50)).toBeDefined();
      expect(milestones.find(m => m.milestone === 75)).toBeDefined();
      expect(milestones.find(m => m.milestone === 100)).toBeDefined();
      expect(milestones.find(m => m.milestone === 200)).toBeDefined();
    });
  });

  describe('getLetterPatternStats triple letters', () => {
    it('captures words with three consecutive identical letters', () => {
      const patterns = getLetterPatternStats([{ word: 'aaah', date: '20240101' }]);
      expect(patterns.tripleLetters).toContainEqual({ word: 'aaah', date: '20240101' });
    });
  });

  describe('getWordStats', () => {
    it('returns empty stats for an empty array', () => {
      expect(getWordStats([])).toEqual({
        longest: null,
        shortest: null,
        longestPalindrome: null,
        shortestPalindrome: null,
        letterFrequency: {},
      });
    });

    it('finds the longest, shortest, and palindrome extremes', () => {
      const words = [
        { word: 'cat', date: '20240101' },
        { word: 'elephant', date: '20240102' },
        { word: 'deed', date: '20240103' },
        { word: 'level', date: '20240104' },
        { word: 'a', date: '20240105' },
      ];
      const stats = getWordStats(words);
      expect(stats.longest.word).toBe('elephant');
      expect(stats.shortest.word).toBe('a');
      expect(stats.longestPalindrome.word).toBe('level');
      expect(stats.shortestPalindrome.word).toBe('a');
      expect(stats.letterFrequency.e).toBeGreaterThan(0);
    });
  });

  describe('getSyllableStats', () => {
    it('returns null extremes for an empty array', () => {
      expect(getSyllableStats([])).toEqual({ mostSyllables: null, leastSyllables: null });
    });

    it('finds the words with the most and least syllables', () => {
      const words = [
        { word: 'monkey', date: '20240101' },
        { word: 'banana', date: '20240102' },
        { word: 'cat', date: '20240103' },
      ];
      const stats = getSyllableStats(words);
      expect(stats.mostSyllables.word).toBe('banana');
      expect(stats.leastSyllables.word).toBe('cat');
    });
  });

  describe('getLetterTypeStats', () => {
    it('returns null extremes for an empty array', () => {
      expect(getLetterTypeStats([])).toEqual({ mostVowels: null, mostConsonants: null });
    });

    it('finds the words with the most vowels and most consonants', () => {
      const words = [
        { word: 'cat', date: '20240101' },
        { word: 'aeiou', date: '20240102' },
        { word: 'strength', date: '20240103' },
      ];
      const stats = getLetterTypeStats(words);
      expect(stats.mostVowels.word).toBe('aeiou');
      expect(stats.mostConsonants.word).toBe('strength');
    });
  });

  describe('findWordDate', () => {
    const words = [
      { word: 'cat', date: '20240101' },
      { word: 'dog', date: '20240102' },
    ];

    it('returns undefined for an empty target', () => {
      expect(findWordDate(words, '')).toBeUndefined();
    });

    it('returns the date for a matching word', () => {
      expect(findWordDate(words, 'dog')).toBe('20240102');
    });

    it('returns undefined when the word is not present', () => {
      expect(findWordDate(words, 'fish')).toBeUndefined();
    });
  });

  describe('getLetterStatsFromFrequency', () => {
    it('returns an empty array for an empty frequency map', () => {
      expect(getLetterStatsFromFrequency({})).toEqual([]);
    });

    it('returns letter entries sorted by descending count, filtering non-letters', () => {
      const sorted = getLetterStatsFromFrequency({ a: 5, b: 3, '1': 9 });
      expect(sorted).toEqual([['a', 5], ['b', 3]]);
    });
  });

  describe('getLongestStreakWords', () => {
    it('returns the input unchanged for length <= 1', () => {
      expect(getLongestStreakWords([])).toEqual([]);
      const one = [{ word: 'solo', date: '20240101' }];
      expect(getLongestStreakWords(one)).toEqual(one);
    });

    it('returns the longest consecutive run in chronological order', () => {
      const words = [
        { word: 'a', date: '20240101' },
        { word: 'b', date: '20240102' },
        { word: 'c', date: '20240103' },
        { word: 'gap', date: '20240110' },
        { word: 'd', date: '20240111' },
      ];
      expect(getLongestStreakWords(words).map(w => w.word)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('getAntiStreakStats', () => {
    it('returns an empty result for <= 1 word', () => {
      expect(getAntiStreakStats([])).toEqual({
        longestGap: 0,
        gapStartWord: null,
        gapEndWord: null,
        gapStartDate: null,
        gapEndDate: null,
      });
      expect(getAntiStreakStats([{ word: 'solo', date: '20240101' }]).longestGap).toBe(0);
    });

    it('finds the longest gap between consecutive word dates', () => {
      const words = [
        { word: 'a', date: '20240101' },
        { word: 'b', date: '20240103' },
        { word: 'c', date: '20240110' },
      ];
      const result = getAntiStreakStats(words);
      expect(result.longestGap).toBe(6);
      expect(result.gapStartWord.word).toBe('b');
      expect(result.gapEndWord.word).toBe('c');
      expect(result.gapStartDate).toBe('20240103');
      expect(result.gapEndDate).toBe('20240110');
    });
  });

  describe('streak helpers (time-sensitive)', () => {
    const BASE = new Date('2024-06-15T12:00:00Z');
    const offset = (n) => {
      const d = new Date(BASE);
      d.setDate(d.getDate() + n);
      return dateToYYYYMMDD(d);
    };

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(BASE);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('getCurrentStreakWords', () => {
      it('returns [] for an empty array', () => {
        expect(getCurrentStreakWords([])).toEqual([]);
      });

      it('returns [] when the most recent word is neither today nor yesterday', () => {
        expect(getCurrentStreakWords([{ word: 'old', date: offset(-10) }])).toEqual([]);
      });

      it('collects consecutive words ending today, stopping at the first gap', () => {
        const words = [
          { word: 'd0', date: offset(0) },
          { word: 'd1', date: offset(-1) },
          { word: 'd2', date: offset(-2) },
          { word: 'gap', date: offset(-5) },
        ];
        expect(getCurrentStreakWords(words).map(w => w.word)).toEqual(['d0', 'd1', 'd2']);
      });
    });

    describe('getCurrentStreakStats', () => {
      it('returns zeros for an empty array', () => {
        expect(getCurrentStreakStats([])).toEqual({
          currentStreak: 0,
          longestStreak: 0,
          isActive: false,
        });
      });

      it('reports a single active word', () => {
        expect(getCurrentStreakStats([{ word: 'solo', date: offset(0) }])).toEqual({
          currentStreak: 1,
          longestStreak: 1,
          isActive: true,
        });
      });

      it('computes current and longest streaks across a gap', () => {
        const words = [
          { word: 'd0', date: offset(0) },
          { word: 'd1', date: offset(-1) },
          { word: 'gap', date: offset(-4) },
          { word: 'g1', date: offset(-5) },
          { word: 'g2', date: offset(-6) },
        ];
        const stats = getCurrentStreakStats(words);
        expect(stats.isActive).toBe(true);
        expect(stats.currentStreak).toBe(2);
        expect(stats.longestStreak).toBe(3);
      });

      it('reports inactive with no current streak when the most recent word is stale', () => {
        const stats = getCurrentStreakStats([
          { word: 'old', date: offset(-10) },
          { word: 'older', date: offset(-11) },
        ]);
        expect(stats.isActive).toBe(false);
        expect(stats.currentStreak).toBe(0);
        expect(stats.longestStreak).toBe(2);
      });
    });
  });
});