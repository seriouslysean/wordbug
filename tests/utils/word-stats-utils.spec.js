import { describe, expect, it } from 'vitest';

import {
  getChronologicalMilestones,
  getLetterPatternStats,
  getLetterStats,
  getPatternStats,
  getWordEndingStats,
} from '#utils/word-stats-utils';
import { areConsecutiveDays } from '#utils/date-utils';

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
});