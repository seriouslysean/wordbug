import { describe, expect, it } from 'vitest';

import {
  countSyllables,
  formatWordCount,
  getConsonantCount,
  getVowelCount,
  getWordEndings,
  hasAlphabeticalSequence,
  hasDoubleLetters,
  hasTripleLetters,
  isAllConsonants,
  isAllVowels,
  isPalindrome,
  isStartEndSame,
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

  describe('isStartEndSame', () => {
    it('returns true for words that start and end with the same letter', () => {
      expect(isStartEndSame('level')).toBe(true);
      expect(isStartEndSame('radar')).toBe(true);
      expect(isStartEndSame('bob')).toBe(true);
    });
    it('returns false for words that do not', () => {
      expect(isStartEndSame('hello')).toBe(false);
      expect(isStartEndSame('world')).toBe(false);
      expect(isStartEndSame('a')).toBe(false);
    });
  });

  describe('hasDoubleLetters', () => {
    it('returns true for words with double letters', () => {
      expect(hasDoubleLetters('letter')).toBe(true);
      expect(hasDoubleLetters('book')).toBe(true);
      expect(hasDoubleLetters('success')).toBe(true);
    });
    it('returns false for words without double letters', () => {
      expect(hasDoubleLetters('cat')).toBe(false);
      expect(hasDoubleLetters('dog')).toBe(false);
    });
  });

  describe('hasTripleLetters', () => {
    it('returns true for words with triple or more consecutive letters', () => {
      expect(hasTripleLetters('zzz')).toBe(true); // three z's
      expect(hasTripleLetters('aaa')).toBe(true); // three a's
      expect(hasTripleLetters('goooood')).toBe(true); // four o's
    });
    it('returns false for words with only double or no consecutive letters', () => {
      expect(hasTripleLetters('bookkeeper')).toBe(false); // only double letters
      expect(hasTripleLetters('committee')).toBe(false); // only double letters
      expect(hasTripleLetters('letter')).toBe(false);
      expect(hasTripleLetters('cat')).toBe(false);
    });
  });

  describe('hasAlphabeticalSequence', () => {
    it('returns true for words with three consecutive alphabetical letters', () => {
      expect(hasAlphabeticalSequence('abc')).toBe(true); // a-b-c
      expect(hasAlphabeticalSequence('xyz')).toBe(true); // x-y-z
      expect(hasAlphabeticalSequence('defg')).toBe(true); // d-e-f
      expect(hasAlphabeticalSequence('definitely')).toBe(true); // d-e-f at start
    });
    it('returns false for words without such a sequence', () => {
      expect(hasAlphabeticalSequence('hello')).toBe(false);
      expect(hasAlphabeticalSequence('world')).toBe(false);
      expect(hasAlphabeticalSequence('jumpy')).toBe(false);
      expect(hasAlphabeticalSequence('abacus')).toBe(false); // a-b but then breaks with a-c
      expect(hasAlphabeticalSequence('jumped')).toBe(false); // no consecutive sequences
    });
  });

  describe('hasAlphabeticalSequence (~utils)', () => {
    it('detects sequences in lowercase words', () => {
      expect(hasAlphabeticalSequence('lmn')).toBe(true);
    });

    it('detects sequences in mixed-case words', () => {
      expect(hasAlphabeticalSequence('aBc')).toBe(true);
    });

    it('returns false when no sequence exists', () => {
      expect(hasAlphabeticalSequence('abd')).toBe(false);
    });
  });

  describe('getWordEndings', () => {
    it('returns all matching endings for a word', () => {
      expect(getWordEndings('running')).toContain('ing');
      expect(getWordEndings('happily')).toContain('ly');
      expect(getWordEndings('kindness')).toContain('ness');
      expect(getWordEndings('careful')).toContain('ful');
      expect(getWordEndings('hopeless')).toContain('less');
      expect(getWordEndings('walked')).toContain('ed');
    });
    it('returns an empty array if no endings match', () => {
      expect(getWordEndings('cat')).toEqual([]);
      expect(getWordEndings('dog')).toEqual([]);
    });
  });

  describe('isAllVowels', () => {
    it('returns true for words with only vowels', () => {
      expect(isAllVowels('aeiou')).toBe(true);
      expect(isAllVowels('AEIOU')).toBe(true);
    });
    it('returns false for words with consonants', () => {
      expect(isAllVowels('hello')).toBe(false);
      expect(isAllVowels('aebc')).toBe(false);
    });
  });

  describe('isAllConsonants', () => {
    it('returns true for words with only consonants', () => {
      expect(isAllConsonants('bcdfg')).toBe(true);
      expect(isAllConsonants('BCDFG')).toBe(true);
    });
    it('returns false for words with vowels', () => {
      expect(isAllConsonants('hello')).toBe(false);
      expect(isAllConsonants('bcda')).toBe(false);
    });
  });
});