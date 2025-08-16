import { describe, expect, it } from 'vitest';

import { formatWordCount, t } from '~utils/i18n-utils';

describe('i18n-utils', () => {
  describe('t', () => {
    it('returns simple translations', () => {
      expect(t('nav.home')).toBe('Home');
      expect(t('nav.stats')).toBe('Stats');
      expect(t('footer.powered_by')).toBe('Powered by Wordnik');
    });

    it('handles nested keys', () => {
      expect(t('stats.total_words')).toBe('Total Words');
      expect(t('stats.word_lengths')).toBe('Word Lengths');
      expect(t('stats.milestone_words')).toBe('Milestone Words');
    });

    it('supports variable interpolation', () => {
      expect(t('stats.days', { count: 5 })).toBe('5 Days');
      expect(t('stats.days', { count: 1 })).toBe('1 Days');
      expect(t('words.length_words', { length: 7 })).toBe('7-Letter Words');
      expect(t('words.words_starting_with', { letter: 'A' })).toBe('Words Starting with A');
    });

    it('handles multiple variable interpolation', () => {
      expect(t('browse.words_across_years', { totalWords: 100, yearCount: 3 })).toBe('100 Words Across 3 Years');
      expect(t('browse.different_lengths', { lengthCount: 10 })).toBe('10 Different Lengths');
      expect(t('browse.letters_a_to_z', { letterCount: 26 })).toBe('26 Letters (A-Z)');
    });

    it('handles special characters in interpolation', () => {
      expect(t('stats.least_common_letter', { count: 1, plural: '' })).toBe('Least Common Letter (1 Word)');
      expect(t('stats.least_common_letter', { count: 2, plural: 's' })).toBe('Least Common Letter (2 Words)');
    });

    it('throws when translation is missing', () => {
      expect(() => t('non.existent.key')).toThrow('Translation missing for key: non.existent.key');
    });

    it('throws when partial path is invalid', () => {
      expect(() => t('nav.nonexistent')).toThrow('Translation missing for key: nav.nonexistent');
    });

    it('throws when required variables are missing', () => {
      expect(() => t('stats.days')).toThrow("Translation key 'stats.days' requires variables but none were provided");
      expect(() => t('stats.days', {})).toThrow("Missing required variable 'count' for translation key: stats.days");
    });

    it('throws when interpolation values are null or undefined', () => {
      expect(() => t('stats.days', { count: undefined })).toThrow("Variable 'count' is undefined or null for translation key: stats.days");
      expect(() => t('stats.days', { count: null })).toThrow("Variable 'count' is undefined or null for translation key: stats.days");
    });

    it('allows zero and empty string values', () => {
      expect(t('stats.days', { count: 0 })).toBe('0 Days');
      expect(t('common.words_other', { count: 0 })).toBe('0 Words');
    });
  });

  describe('formatWordCount', () => {
    it('formats zero correctly', () => {
      expect(formatWordCount(0)).toBe('No Words');
    });

    it('formats singular correctly', () => {
      expect(formatWordCount(1)).toBe('1 Word');
    });

    it('formats plural correctly', () => {
      expect(formatWordCount(2)).toBe('2 Words');
      expect(formatWordCount(10)).toBe('10 Words');
      expect(formatWordCount(100)).toBe('100 Words');
      expect(formatWordCount(999)).toBe('999 Words');
    });

    it('handles negative numbers', () => {
      expect(formatWordCount(-1)).toBe('-1 Words');
      expect(formatWordCount(-10)).toBe('-10 Words');
    });

    it('handles large numbers', () => {
      expect(formatWordCount(1000)).toBe('1000 Words');
      expect(formatWordCount(1000000)).toBe('1000000 Words');
    });
  });
});