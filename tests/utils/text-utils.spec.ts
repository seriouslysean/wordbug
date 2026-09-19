import { describe, expect, it } from 'vitest';

import {
  collapseWhitespace,
  countSyllables,
  flattenErrors,
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
  serializeJsonLd,
} from '#utils/text-utils';

describe('text-utils', () => {
  describe('getVowelCount', () => {
    it('counts vowels correctly', () => {
      // e, o
      expect(getVowelCount('hello')).toBe(2);
      // a, i, i, e
      expect(getVowelCount('magnificent')).toBe(4);
      expect(getVowelCount('aeiou')).toBe(5);
      expect(getVowelCount('AEIOU')).toBe(5);
    });

    it('handles edge cases', () => {
      expect(getVowelCount('')).toBe(0);
      expect(getVowelCount('xyz')).toBe(0);
      expect(getVowelCount('bcdfg')).toBe(0);
    });

    it('handles null/undefined input', () => {
      // Deliberately exercises the runtime guard with invalid input.
      // @ts-expect-error null is a deliberate invalid runtime input.
      expect(getVowelCount(null)).toBe(0);
      // @ts-expect-error undefined is a deliberate invalid runtime input.
      expect(getVowelCount(undefined)).toBe(0);
    });
  });

  describe('getConsonantCount', () => {
    it('counts consonants correctly', () => {
      // h, l, l
      expect(getConsonantCount('hello')).toBe(3);
      // m, g, n, f, c, n, t
      expect(getConsonantCount('magnificent')).toBe(7);
      expect(getConsonantCount('bcdfg')).toBe(5);
      expect(getConsonantCount('BCDFG')).toBe(5);
    });

    it('handles edge cases', () => {
      expect(getConsonantCount('')).toBe(0);
      expect(getConsonantCount('aeiou')).toBe(0);
      expect(getConsonantCount('123!@#')).toBe(0);
    });

    it('handles null/undefined input', () => {
      // Deliberately exercises the runtime guard with invalid input.
      // @ts-expect-error null is a deliberate invalid runtime input.
      expect(getConsonantCount(null)).toBe(0);
      // @ts-expect-error undefined is a deliberate invalid runtime input.
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
      // @ts-expect-error null is a deliberate invalid runtime input.
      expect(isPalindrome(null)).toBe(false);
      // @ts-expect-error undefined is a deliberate invalid runtime input.
      expect(isPalindrome(undefined)).toBe(false);
    });
  });

  describe('countSyllables', () => {
    it('counts syllables for common words', () => {
      // hel-lo
      expect(countSyllables('hello')).toBe(2);
      // mag-nif-i-cent
      expect(countSyllables('magnificent')).toBe(4);
      expect(countSyllables('cat')).toBe(1);
      // beau-ti-ful
      expect(countSyllables('beautiful')).toBe(3);
    });

    it('handles special cases', () => {
      // special case defined in code
      expect(countSyllables('ululated')).toBe(4);
      // ends with 'e' but still 1 syllable
      expect(countSyllables('the')).toBe(1);
      // ends with 'e'
      expect(countSyllables('ate')).toBe(1);
    });

    it('ensures minimum of 1 syllable', () => {
      expect(countSyllables('a')).toBe(1);
      expect(countSyllables('I')).toBe(1);
      expect(countSyllables('xyz')).toBe(1);
    });

    it('handles edge cases', () => {
      expect(countSyllables('')).toBe(0);
      // @ts-expect-error null is a deliberate invalid runtime input.
      expect(countSyllables(null)).toBe(0);
      // @ts-expect-error undefined is a deliberate invalid runtime input.
      expect(countSyllables(undefined)).toBe(0);
    });

    it('is case insensitive', () => {
      expect(countSyllables('HELLO')).toBe(2);
      expect(countSyllables('Hello')).toBe(2);
      expect(countSyllables('MAGNIFICENT')).toBe(4);
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
      // three z's
      expect(hasTripleLetters('zzz')).toBe(true);
      // three a's
      expect(hasTripleLetters('aaa')).toBe(true);
      // four o's
      expect(hasTripleLetters('goooood')).toBe(true);
    });
    it('returns false for words with only double or no consecutive letters', () => {
      // only double letters
      expect(hasTripleLetters('bookkeeper')).toBe(false);
      // only double letters
      expect(hasTripleLetters('committee')).toBe(false);
      expect(hasTripleLetters('letter')).toBe(false);
      expect(hasTripleLetters('cat')).toBe(false);
    });
  });

  describe('hasAlphabeticalSequence', () => {
    it('returns true for words with three consecutive alphabetical letters', () => {
      // a-b-c
      expect(hasAlphabeticalSequence('abc')).toBe(true);
      // x-y-z
      expect(hasAlphabeticalSequence('xyz')).toBe(true);
      // d-e-f
      expect(hasAlphabeticalSequence('defg')).toBe(true);
      // d-e-f at start
      expect(hasAlphabeticalSequence('definitely')).toBe(true);
    });
    it('returns false for words without such a sequence', () => {
      expect(hasAlphabeticalSequence('hello')).toBe(false);
      expect(hasAlphabeticalSequence('world')).toBe(false);
      expect(hasAlphabeticalSequence('jumpy')).toBe(false);
      // a-b but then breaks with a-c
      expect(hasAlphabeticalSequence('abacus')).toBe(false);
      // no consecutive sequences
      expect(hasAlphabeticalSequence('jumped')).toBe(false);
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
describe('flattenErrors', () => {
  it('returns a plain error or thrown value as a single-item list', () => {
    const error = new Error('boom');
    expect(flattenErrors(error)).toEqual([error]);
    expect(flattenErrors('boom')).toEqual(['boom']);
  });

  it('returns the failures of an AggregateError in order', () => {
    const first = new Error('first');
    const second = new Error('second');
    expect(flattenErrors(new AggregateError([first, second], 'both'))).toEqual([first, second]);
  });

  it('flattens nested AggregateErrors depth-first', () => {
    const [a, b, c] = [new Error('a'), new Error('b'), new Error('c')];
    const nested = new AggregateError([a, new AggregateError([b, c], 'inner')], 'outer');
    expect(flattenErrors(nested)).toEqual([a, b, c]);
  });
});

describe('collapseWhitespace', () => {
  it('joins lines with a single space', () => {
    expect(collapseWhitespace('Line one\nLine two')).toBe('Line one Line two');
    expect(collapseWhitespace('Line one\r\n\r\nLine two')).toBe('Line one Line two');
  });

  it('collapses runs of spaces and tabs', () => {
    expect(collapseWhitespace('ice  \t cream')).toBe('ice cream');
  });

  it('trims both ends', () => {
    expect(collapseWhitespace('\n  word \t')).toBe('word');
    expect(collapseWhitespace(' \n ')).toBe('');
  });

  it('leaves single-line text alone', () => {
    expect(collapseWhitespace("rock & roll's")).toBe("rock & roll's");
  });
});

describe('serializeJsonLd', () => {
  const schema = {
    '@type': 'DefinedTerm',
    description: 'Encoded </script><img src=x onerror=alert(1)> and a < b',
  };

  it('writes no < that could end the script element', () => {
    expect(serializeJsonLd(schema)).not.toContain('<');
    expect(serializeJsonLd(schema)).toContain(String.raw`\u003c/script>\u003cimg`);
  });

  it('parses back to the same value', () => {
    expect(JSON.parse(serializeJsonLd(schema))).toStrictEqual(schema);
  });

  it('matches JSON.stringify when there is no <', () => {
    const plain = { '@type': 'WebSite', name: 'occasional-wotd & friends' };
    expect(serializeJsonLd(plain)).toBe(JSON.stringify(plain));
  });
});
