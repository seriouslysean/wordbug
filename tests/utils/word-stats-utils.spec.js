import { describe, expect,it } from 'vitest';

import {
  findWordDate,
  getCurrentStreakStats,
  getLetterPatternStats,
  getLetterStats,
  getLetterTypeStats,
  // getMilestoneWords,
  getPatternStats,
  getSyllableStats,
  getWordEndingStats,
  getWordStats,
} from '../../src/utils/word-stats-utils';

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
  describe('getWordStats', () => {
    it('calculates basic word statistics', () => {
      const stats = getWordStats(sampleWords);

      expect(stats.shortest).toEqual({ word: 'a', length: 1 });
      expect(stats.longest).toEqual({ word: 'programming', length: 11 });
      expect(stats.shortestPalindrome).toEqual({ word: 'a', length: 1 });
      expect(stats.longestPalindrome).toEqual({ word: 'deed', length: 4 });
      expect(stats.letterFrequency).toHaveProperty('e');
      expect(stats.letterFrequency.e).toBeGreaterThan(0);
    });

    it('handles empty word array', () => {
      const stats = getWordStats(emptyWords);

      expect(stats.shortest).toBeNull();
      expect(stats.longest).toBeNull();
      expect(stats.shortestPalindrome).toBeNull();
      expect(stats.longestPalindrome).toBeNull();
      expect(stats.letterFrequency).toEqual({});
    });
  });

  describe('getLetterStats', () => {
    it('sorts letter frequency in descending order', () => {
      const frequency = { a: 5, b: 2, c: 8, d: 1 };
      const stats = getLetterStats(frequency);

      expect(stats).toEqual([
        ['c', 8],
        ['a', 5],
        ['b', 2],
        ['d', 1],
      ]);
    });

    it('handles empty frequency object', () => {
      const stats = getLetterStats({});
      expect(stats).toEqual([]);
    });
  });


  describe('getLetterPatternStats', () => {
    it('identifies various letter patterns', () => {
      const patterns = getLetterPatternStats(sampleWords);

      expect(patterns.startEndSame).toEqual([{ word: 'deed', date: '20240107' }]);
      expect(patterns.doubleLetters).toEqual([
        { word: 'hello', date: '20240101' },
        { word: 'programming', date: '20240104' },
        { word: 'occasional', date: '20240106' },
        { word: 'deed', date: '20240107' },
        { word: 'seeing', date: '20240110' },
      ]);
      expect(patterns.tripleLetters).toEqual([]);
      expect(patterns.alphabetical).toEqual([{ word: 'abcd', date: '20240103' }]);
    });

    it('handles empty word array', () => {
      const patterns = getLetterPatternStats(emptyWords);

      expect(patterns.startEndSame).toEqual([]);
      expect(patterns.doubleLetters).toEqual([]);
      expect(patterns.tripleLetters).toEqual([]);
      expect(patterns.alphabetical).toEqual([]);
    });
  });

  describe('getWordEndingStats', () => {
    it('categorizes words by endings', () => {
      const endings = getWordEndingStats(sampleWords);

      expect(endings.ing).toEqual([
        { word: 'programming', date: '20240104' },
        { word: 'testing', date: '20240105' },
        { word: 'seeing', date: '20240110' },
      ]);
      expect(endings.ed).toEqual([
        { word: 'deed', date: '20240107' },
        { word: 'worked', date: '20240111' },
      ]);
      expect(endings.ly).toEqual([]);
    });

    it('handles empty word array', () => {
      const endings = getWordEndingStats(emptyWords);

      expect(endings.ing).toEqual([]);
      expect(endings.ed).toEqual([]);
      expect(endings.ly).toEqual([]);
    });
  });

  describe('getCurrentStreakStats', () => {
    it('calculates streaks correctly', () => {
      const consecutiveWords = [
        { word: 'word1', date: '20240101' },
        { word: 'word2', date: '20240102' },
        { word: 'word3', date: '20240103' },
        { word: 'word4', date: '20240105' }, // gap
        { word: 'word5', date: '20240106' },
      ];

      const streaks = getCurrentStreakStats(consecutiveWords);

      expect(streaks.longestStreak).toBe(3);
      expect(streaks.currentStreak).toBe(0); // not active since dates are in past
      expect(streaks.isActive).toBe(false);
    });

    it('handles empty word array', () => {
      const streaks = getCurrentStreakStats(emptyWords);

      expect(streaks.currentStreak).toBe(0);
      expect(streaks.longestStreak).toBe(0);
      expect(streaks.isActive).toBe(false);
    });
  });

  describe('getSyllableStats', () => {
    it('finds words with extreme syllable counts', () => {
      const syllableStats = getSyllableStats(sampleWords);

      // 'world' is the first word in our sample array with 1 syllable (the minimum)
      // 'occasional' has the most syllables (4)
      expect(syllableStats.leastSyllables.word).toBe('world'); // First word with 1 syllable
      expect(syllableStats.mostSyllables.word).toBe('occasional'); // Has 4 syllables
    });

    it('handles empty word array', () => {
      const syllableStats = getSyllableStats(emptyWords);

      expect(syllableStats.leastSyllables).toBeNull();
      expect(syllableStats.mostSyllables).toBeNull();
    });
  });

  describe('getLetterTypeStats', () => {
    it('finds words with extreme vowel/consonant counts', () => {
      const letterStats = getLetterTypeStats(sampleWords);

      expect(letterStats.mostVowels.word).toBe('occasional');
      expect(letterStats.mostConsonants.word).toBe('programming');
    });

    it('handles empty word array', () => {
      const letterStats = getLetterTypeStats(emptyWords);

      expect(letterStats.mostVowels).toBeNull();
      expect(letterStats.mostConsonants).toBeNull();
    });
  });

  describe('getPatternStats', () => {
    it('finds special pattern words', () => {
      const patterns = getPatternStats(sampleWords);

      expect(patterns.allVowels).toEqual([{ word: 'a', date: '20240108' }]);
      expect(patterns.allConsonants).toEqual([{ word: 'by', date: '20240109' }]);
      expect(patterns.palindromes).toEqual([
        { word: 'deed', date: '20240107' },
        { word: 'a', date: '20240108' },
      ]);
    });

    it('handles empty word array', () => {
      const patterns = getPatternStats(emptyWords);

      expect(patterns.allVowels).toEqual([]);
      expect(patterns.allConsonants).toEqual([]);
      expect(patterns.palindromes).toEqual([]);
    });
  });

  describe('findWordDate', () => {
    it('finds date for existing word', () => {
      const date = findWordDate(sampleWords, 'hello');
      expect(date).toBe('20240101');
    });

    it('returns undefined for non-existent word', () => {
      const date = findWordDate(sampleWords, 'nonexistent');
      expect(date).toBeUndefined();
    });

    it('handles empty word array', () => {
      const date = findWordDate(emptyWords, 'hello');
      expect(date).toBeUndefined();
    });

    it('handles empty target word', () => {
      const date = findWordDate(sampleWords, '');
      expect(date).toBeUndefined();
    });
  });
});
