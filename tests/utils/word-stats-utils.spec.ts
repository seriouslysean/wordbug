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
import type { WordData } from '#types';

const makeWord = (word: string, date: string, preserveCase = false): WordData => ({
  word, date, adapter: 'test', data: [{ text: 'definition' }], ...(preserveCase ? { preserveCase: true } : {}),
});

const sampleWords = [
  makeWord('hello', '20240101'),
  makeWord('world', '20240102'),
  makeWord('abcd', '20240103'),
  makeWord('programming', '20240104'),
  makeWord('testing', '20240105'),
  makeWord('occasional', '20240106'),
  // palindrome
  makeWord('deed', '20240107'),
  // single vowel
  makeWord('a', '20240108'),
  // consonants only
  makeWord('by', '20240109'),
  // double letters + ending
  makeWord('seeing', '20240110'),
  // ends with -ed
  makeWord('worked', '20240111'),
];

const emptyWords: WordData[] = [];
const requireValue = <T>(value: T | null | undefined): T => {
  if (value == null) {
    throw new Error('Expected a value');
  }
  return value;
};

describe('word-stats-utils', () => {
  describe('getLetterStats', () => {
    // 'i' and 's' occur most often (4 each, all inside one word), but 'a' is
    // the letter found in the most words. Commonness is words containing.
    const disagreeing = [
      makeWord('mississippi', '20240101'),
      makeWord('bat', '20240102'),
      makeWord('cat', '20240103'),
    ];

    it('ranks letters by the number of words containing them, not by occurrences', () => {
      const stats = getLetterStats(disagreeing);

      expect(stats.mostCommon).toBe('a');
      expect(stats.mostCommonCount).toBe(2);
      expect(stats.wordsWithMostCommon.map(w => w.word)).toEqual(['bat', 'cat']);
    });

    it('lists exactly the words its count reports, for both ends of the ranking', () => {
      const stats = getLetterStats(disagreeing);

      expect(stats.leastCommon).toBe('c');
      expect(stats.wordsWithLeastCommon).toHaveLength(stats.leastCommonCount);
      expect(stats.wordsWithMostCommon).toHaveLength(stats.mostCommonCount);
      expect(stats.ranked[0]).toEqual(['a', 2]);
      expect(stats.ranked.at(-1)).toEqual(['c', 1]);
    });

    it('matches capitalized preserveCase words case-insensitively', () => {
      const stats = getLetterStats([
        makeWord('Apple', '20240101', true),
        makeWord('banana', '20240102'),
        makeWord('kiwi', '20240103'),
      ]);

      expect(stats.mostCommon).toBe('a');
      expect(stats.mostCommonCount).toBe(2);
      expect(stats.wordsWithMostCommon.map(w => w.word)).toEqual(['Apple', 'banana']);
    });

    it('ignores characters outside a-z', () => {
      const stats = getLetterStats([makeWord('PB&J', '20240101', true)]);

      expect(stats.ranked.map(([letter]) => letter)).toEqual(['p', 'b', 'j']);
    });

    it('handles empty word array', () => {
      const stats = getLetterStats(emptyWords);

      expect(stats).toEqual({
        ranked: [],
        mostCommon: '',
        leastCommon: '',
        mostCommonCount: 0,
        leastCommonCount: 0,
        wordsWithMostCommon: [],
        wordsWithLeastCommon: [],
      });
    });
  });

  describe('getLetterPatternStats', () => {
    it('identifies various letter patterns', () => {
      const patterns = getLetterPatternStats(sampleWords);

      expect(patterns.startEndSame).toContainEqual(makeWord('deed', '20240107'));
      expect(patterns.doubleLetters).toContainEqual(makeWord('hello', '20240101'));
      expect(patterns.doubleLetters).toContainEqual(makeWord('programming', '20240104'));
      expect(patterns.doubleLetters).toContainEqual(makeWord('seeing', '20240110'));
      expect(patterns.alphabetical).toContainEqual(makeWord('abcd', '20240103'));
      expect(patterns.palindromes).toContainEqual(makeWord('deed', '20240107'));
      expect(patterns.palindromes).toContainEqual(makeWord('a', '20240108'));
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

      expect(endings.ing).toContainEqual(makeWord('programming', '20240104'));
      expect(endings.ing).toContainEqual(makeWord('testing', '20240105'));
      expect(endings.ing).toContainEqual(makeWord('seeing', '20240110'));
      expect(endings.ed).toContainEqual(makeWord('worked', '20240111'));
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

      expect(patterns.allVowels).toContainEqual(makeWord('a', '20240108'));
      expect(patterns.allConsonants).toContainEqual(makeWord('by', '20240109'));
      expect(patterns.palindromes).toContainEqual(makeWord('deed', '20240107'));
      expect(patterns.palindromes).toContainEqual(makeWord('a', '20240108'));
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
      expect(requireValue(firstMilestone).word).toEqual(makeWord('hello', '20240101'));
      
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
        date: `2024${String(Math.floor(i / 31) + 1).padStart(2, '0')}${String((i % 31) + 1).padStart(2, '0')}`,
        adapter: 'test',
        data: [{ text: 'definition' }]
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
      const patterns = getLetterPatternStats([makeWord('aaah', '20240101')]);
      expect(patterns.tripleLetters).toContainEqual(makeWord('aaah', '20240101'));
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
        makeWord('cat', '20240101'),
        makeWord('elephant', '20240102'),
        makeWord('deed', '20240103'),
        makeWord('level', '20240104'),
        makeWord('a', '20240105'),
      ];
      const stats = getWordStats(words);
      expect(requireValue(stats.longest).word).toBe('elephant');
      expect(requireValue(stats.shortest).word).toBe('a');
      expect(requireValue(stats.longestPalindrome).word).toBe('level');
      expect(requireValue(stats.shortestPalindrome).word).toBe('a');
      expect(stats.letterFrequency.e).toBeGreaterThan(0);
    });
  });

  describe('getSyllableStats', () => {
    it('returns null extremes for an empty array', () => {
      expect(getSyllableStats([])).toEqual({
        mostSyllables: null,
        leastSyllables: null,
        mostSyllablesCount: 0,
        leastSyllablesCount: 0,
      });
    });

    it('reports the same pronunciation-backed counts it selected the words with', () => {
      // The spelling heuristic gives 'karaoke' 2 and 'fire' 1; the CMU
      // dictionary gives 4 and 2. A label from the heuristic would say the
      // most-syllables word has fewer syllables than 'banana'.
      const stats = getSyllableStats([
        makeWord('karaoke', '20240101'),
        makeWord('banana', '20240102'),
        makeWord('fire', '20240103'),
      ]);

      expect(requireValue(stats.mostSyllables).word).toBe('karaoke');
      expect(stats.mostSyllablesCount).toBe(4);
      expect(requireValue(stats.leastSyllables).word).toBe('fire');
      expect(stats.leastSyllablesCount).toBe(2);
    });

    it('finds the words with the most and least syllables', () => {
      const words = [
        makeWord('monkey', '20240101'),
        makeWord('banana', '20240102'),
        makeWord('cat', '20240103'),
      ];
      const stats = getSyllableStats(words);
      expect(requireValue(stats.mostSyllables).word).toBe('banana');
      expect(requireValue(stats.leastSyllables).word).toBe('cat');
    });
  });

  describe('getLetterTypeStats', () => {
    it('returns null extremes for an empty array', () => {
      expect(getLetterTypeStats([])).toEqual({ mostVowels: null, mostConsonants: null });
    });

    it('finds the words with the most vowels and most consonants', () => {
      const words = [
        makeWord('cat', '20240101'),
        makeWord('aeiou', '20240102'),
        makeWord('strength', '20240103'),
      ];
      const stats = getLetterTypeStats(words);
      expect(requireValue(stats.mostVowels).word).toBe('aeiou');
      expect(requireValue(stats.mostConsonants).word).toBe('strength');
    });
  });

  describe('findWordDate', () => {
    const words = [
      makeWord('cat', '20240101'),
      makeWord('dog', '20240102'),
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
      const one = [makeWord('solo', '20240101')];
      expect(getLongestStreakWords(one)).toEqual(one);
    });

    it('returns the longest consecutive run in chronological order', () => {
      const words = [
        makeWord('a', '20240101'),
        makeWord('b', '20240102'),
        makeWord('c', '20240103'),
        makeWord('gap', '20240110'),
        makeWord('d', '20240111'),
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
      expect(getAntiStreakStats([makeWord('solo', '20240101')]).longestGap).toBe(0);
    });

    it('finds the longest gap between consecutive word dates', () => {
      const words = [
        makeWord('a', '20240101'),
        makeWord('b', '20240103'),
        makeWord('c', '20240110'),
      ];
      const result = getAntiStreakStats(words);
      expect(result.longestGap).toBe(6);
      expect(requireValue(result.gapStartWord).word).toBe('b');
      expect(requireValue(result.gapEndWord).word).toBe('c');
      expect(result.gapStartDate).toBe('20240103');
      expect(result.gapEndDate).toBe('20240110');
    });

    describe('across a daylight-saving change', () => {
      beforeEach(() => {
        // Node re-reads TZ on assignment, so local midnights below follow US Eastern rules
        vi.stubEnv('TZ', 'America/New_York');
      });

      afterEach(() => {
        vi.unstubAllEnvs();
      });

      it('counts the skipped calendar day when the gap spans spring-forward', () => {
        // 2025-03-09 is a 23-hour day: Mar 8 to Mar 10 is 47 hours, which floors to one day
        const words = [
          makeWord('before', '20250308'),
          makeWord('after', '20250310'),
        ];
        const result = getAntiStreakStats(words);
        expect(result.longestGap).toBe(1);
        expect(result.gapStartDate).toBe('20250308');
        expect(result.gapEndDate).toBe('20250310');
      });

      it('does not invent a gap when the span includes fall-back', () => {
        // 2025-11-02 is a 25-hour day
        const words = [
          makeWord('before', '20251101'),
          makeWord('during', '20251102'),
          makeWord('after', '20251103'),
        ];
        expect(getAntiStreakStats(words).longestGap).toBe(0);
      });
    });
  });

  describe('streak helpers (time-sensitive)', () => {
    const BASE = new Date('2024-06-15T12:00:00Z');
    const offset = (n: number) => {
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
        expect(getCurrentStreakWords([makeWord('old', offset(-10))])).toEqual([]);
      });

      it('collects consecutive words ending today, stopping at the first gap', () => {
        const words = [
          makeWord('d0', offset(0)),
          makeWord('d1', offset(-1)),
          makeWord('d2', offset(-2)),
          makeWord('gap', offset(-5)),
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
        expect(getCurrentStreakStats([makeWord('solo', offset(0))])).toEqual({
          currentStreak: 1,
          longestStreak: 1,
          isActive: true,
        });
      });

      it('computes current and longest streaks across a gap', () => {
        const words = [
          makeWord('d0', offset(0)),
          makeWord('d1', offset(-1)),
          makeWord('gap', offset(-4)),
          makeWord('g1', offset(-5)),
          makeWord('g2', offset(-6)),
        ];
        const stats = getCurrentStreakStats(words);
        expect(stats.isActive).toBe(true);
        expect(stats.currentStreak).toBe(2);
        expect(stats.longestStreak).toBe(3);
      });

      it('reports inactive with no current streak when the most recent word is stale', () => {
        const stats = getCurrentStreakStats([
          makeWord('old', offset(-10)),
          makeWord('older', offset(-11)),
        ]);
        expect(stats.isActive).toBe(false);
        expect(stats.currentStreak).toBe(0);
        expect(stats.longestStreak).toBe(2);
      });
    });
  });
});
