import { describe, expect, it, vi } from 'vitest';

import { tp } from '#utils/i18n-utils';

// tests/setup.ts swaps the locale for a small fixture; these are the strings
// the site ships. Vitest hoists the call above the imports.
vi.unmock('#locales/en.json');

describe('shipped locale plurals', () => {
  it.each([
    ['stats.shortest', 'Shortest (1 Letter)', 'Shortest (2 Letters)'],
    ['stats.longest', 'Longest (1 Letter)', 'Longest (2 Letters)'],
    ['stats.least_syllables', 'Least Syllables (1 Syllable)', 'Least Syllables (2 Syllables)'],
    ['stats.most_syllables', 'Most Syllables (1 Syllable)', 'Most Syllables (2 Syllables)'],
    ['stats.most_vowels', 'Most Vowels (1 Vowel)', 'Most Vowels (2 Vowels)'],
    ['stats.most_consonants', 'Most Consonants (1 Consonant)', 'Most Consonants (2 Consonants)'],
    ['stats.most_common_letter', 'Most Common Letter (1 Word)', 'Most Common Letter (2 Words)'],
    ['stats.least_common_letter', 'Least Common Letter (1 Word)', 'Least Common Letter (2 Words)'],
    ['stats.days', '1 Day', '2 Days'],
    ['words.length_words_description', 'Words containing exactly 1 letter.', 'Words containing exactly 2 letters.'],
  ])('%s agrees with a count of one and of two', (key, one, two) => {
    expect(tp(key, 1)).toBe(one);
    expect(tp(key, 2)).toBe(two);
  });

  // The related-word and browse link titles carry a second value; a count of
  // zero must still have a form, since tp throws without one
  it.each([
    ['common.title_starting_with', 'A', 'No words starting with A', '1 word starting with A', '2 words starting with A'],
    ['common.title_from_context', '2024', 'No words from 2024', '1 word from 2024', '2 words from 2024'],
    ['common.title_with_length', '5 letters', 'No words with 5 letters', '1 word with 5 letters', '2 words with 5 letters'],
  ])('%s agrees with its count', (key, value, zero, one, two) => {
    expect(tp(key, 0, { value })).toBe(zero);
    expect(tp(key, 1, { value })).toBe(one);
    expect(tp(key, 2, { value })).toBe(two);
  });

  it('counts the letters of a length title on their own', () => {
    expect(tp('common.title_with_length', 1, { value: tp('common.letters', 1) })).toBe('1 word with 1 letter');
    expect(tp('common.title_with_length', 3, { value: tp('common.letters', 1) })).toBe('3 words with 1 letter');
  });

  // "hmm" is HH M in the CMU dictionary: no vowel sound, so no syllable
  it('word.syllables has a form for zero, one and many', () => {
    expect(tp('word.syllables', 0)).toBe('0 syllables');
    expect(tp('word.syllables', 1)).toBe('1 syllable');
    expect(tp('word.syllables', 2)).toBe('2 syllables');
  });

  // A word with no vowels ("hmm", which also counts no syllables), one with no
  // consonants ("a") and a site with no streak all reach zero
  it.each([
    ['stats.least_syllables', 'Least Syllables (0 Syllables)'],
    ['stats.most_syllables', 'Most Syllables (0 Syllables)'],
    ['stats.most_vowels', 'Most Vowels (0 Vowels)'],
    ['stats.most_consonants', 'Most Consonants (0 Consonants)'],
    ['stats.days', '0 Days'],
  ])('%s has a form for zero', (key, zero) => {
    expect(tp(key, 0)).toBe(zero);
  });
});
