import { describe, expect,it } from 'vitest';

import {
  countSyllables,
  formatWordCount,
  getConsonantCount,
  getVowelCount,
  isPalindrome,
} from '~utils/text-utils';

describe('text-utils', () => {
  describe('getVowelCount', () => {
    it('counts vowels correctly', () => {
      expect(getVowelCount('hello')).toBe(2); // e, o
      expect(getVowelCount('magnificent')).toBe(4); // a, i, i, e
      expect(getVowelCount('aeiou')).toBe(5);
      expect(getVowelCount('AEIOU')).toBe(5);
    });

    it('handles edge cases', () => {
      expect(getVowelCount('')).toBe(0);
      expect(getVowelCount('xyz')).toBe(0);
      expect(getVowelCount('bcdfg')).toBe(0);
    });

    it('handles null/undefined input', () => {
      expect(getVowelCount(null)).toBe(0);
      expect(getVowelCount(undefined)).toBe(0);
    });
  });

  describe('getConsonantCount', () => {
    it('counts consonants correctly', () => {
      expect(getConsonantCount('hello')).toBe(3); // h, l, l
      expect(getConsonantCount('magnificent')).toBe(7); // m, g, n, f, c, n, t
      expect(getConsonantCount('bcdfg')).toBe(5);
      expect(getConsonantCount('BCDFG')).toBe(5);
    });

    it('handles edge cases', () => {
      expect(getConsonantCount('')).toBe(0);
      expect(getConsonantCount('aeiou')).toBe(0);
      expect(getConsonantCount('123!@#')).toBe(0);
    });

    it('handles null/undefined input', () => {
      expect(getConsonantCount(null)).toBe(0);
      expect(getConsonantCount(undefined)).toBe(0);
    });
  });

  describe('isPalindrome', () => {
    it('detects palindromes correctly', () => {
      expect(isPalindrome('racecar')).toBe(true);
      expect(isPalindrome('level')).toBe(true);
      expect(isPalindrome('noon')).toBe(true);
      expect(isPalindrome('a')).toBe(true);
    });

    it('detects non-palindromes correctly', () => {
      expect(isPalindrome('hello')).toBe(false);
      expect(isPalindrome('magnificent')).toBe(false);
      expect(isPalindrome('almost')).toBe(false);
    });

    it('is case insensitive', () => {
      expect(isPalindrome('Racecar')).toBe(true);
      expect(isPalindrome('LEVEL')).toBe(true);
      expect(isPalindrome('RaceCar')).toBe(true);
    });

    it('handles edge cases', () => {
      expect(isPalindrome('')).toBe(false);
      expect(isPalindrome(null)).toBe(false);
      expect(isPalindrome(undefined)).toBe(false);
    });
  });

  describe('countSyllables', () => {
    it('counts syllables for common words', () => {
      expect(countSyllables('hello')).toBe(2); // hel-lo
      expect(countSyllables('magnificent')).toBe(4); // mag-nif-i-cent
      expect(countSyllables('cat')).toBe(1);
      expect(countSyllables('beautiful')).toBe(3); // beau-ti-ful
    });

    it('handles special cases', () => {
      expect(countSyllables('ululated')).toBe(4); // special case defined in code
      expect(countSyllables('the')).toBe(1); // ends with 'e' but still 1 syllable
      expect(countSyllables('ate')).toBe(1); // ends with 'e'
    });

    it('ensures minimum of 1 syllable', () => {
      expect(countSyllables('a')).toBe(1);
      expect(countSyllables('I')).toBe(1);
      expect(countSyllables('xyz')).toBe(1);
    });

    it('handles edge cases', () => {
      expect(countSyllables('')).toBe(0);
      expect(countSyllables(null)).toBe(0);
      expect(countSyllables(undefined)).toBe(0);
    });

    it('is case insensitive', () => {
      expect(countSyllables('HELLO')).toBe(2);
      expect(countSyllables('Hello')).toBe(2);
      expect(countSyllables('MAGNIFICENT')).toBe(4);
    });
  });

  describe('formatWordCount', () => {
    it('formats singular correctly', () => {
      expect(formatWordCount(1)).toBe('1 word');
      expect(formatWordCount(0)).toBe('0 words');
    });

    it('formats plural correctly', () => {
      expect(formatWordCount(2)).toBe('2 words');
      expect(formatWordCount(10)).toBe('10 words');
      expect(formatWordCount(100)).toBe('100 words');
    });

    it('handles edge cases', () => {
      expect(formatWordCount(-1)).toBe('-1 words');
    });
  });
});