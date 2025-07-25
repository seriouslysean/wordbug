import {
  getWordEndings,
  hasAlphabeticalSequence,
  hasDoubleLetters,
  hasTripleLetters,
  isAllConsonants,
  isAllVowels,
  isPalindrome,
  isStartEndSame,
} from '../../../src/utils/text-utils';

describe('text-utils', () => {
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
      expect(hasTripleLetters('bookkeeper')).toBe(true);
      expect(hasTripleLetters('committee')).toBe(true);
      expect(hasTripleLetters('zzz')).toBe(true);
    });
    it('returns false for words with only double or no consecutive letters', () => {
      expect(hasTripleLetters('letter')).toBe(false);
      expect(hasTripleLetters('cat')).toBe(false);
    });
  });

  describe('hasAlphabeticalSequence', () => {
    it('returns true for words with three consecutive alphabetical letters', () => {
      expect(hasAlphabeticalSequence('abc')).toBe(true);
      expect(hasAlphabeticalSequence('definitely')).toBe(true);
      expect(hasAlphabeticalSequence('xyz')).toBe(true);
      expect(hasAlphabeticalSequence('abacus')).toBe(true);
    });
    it('returns false for words without such a sequence', () => {
      expect(hasAlphabeticalSequence('hello')).toBe(false);
      expect(hasAlphabeticalSequence('world')).toBe(false);
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

  describe('isPalindrome', () => {
    it('is case insensitive', () => {
      expect(isPalindrome('Racecar')).toBe(true);
      expect(isPalindrome('LEVEL')).toBe(true);
      expect(isPalindrome('RaceCar')).toBe(true);
    });
    it('returns false for non-palindromes', () => {
      expect(isPalindrome('hello')).toBe(false);
      expect(isPalindrome('world')).toBe(false);
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
