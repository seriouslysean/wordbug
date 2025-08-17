import { describe, expect, it } from 'vitest';

import { t, tp } from '~utils/i18n-utils';

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
      expect(t('browse.summary_years', { totalWords: 100, yearCount: 3 })).toBe('100 Words Across 3 Years');
      expect(t('browse.summary_lengths', { lengthCount: 10 })).toBe('10 Different Lengths');
      expect(t('browse.summary_letters', { letterCount: 26 })).toBe('26 Letters (A-Z)');
    });

    it('supports basic interpolation with multiple variables', () => {
      expect(t('words.length_words', { length: 7 })).toBe('7-Letter Words');
      expect(t('words.words_starting_with', { letter: 'A' })).toBe('Words Starting with A');
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

  describe('tp', () => {
    it('formats zero correctly', () => {
      expect(tp('common.words', 0)).toBe('No Words');
    });

    it('formats singular correctly', () => {
      expect(tp('common.words', 1)).toBe('1 Word');
    });

    it('formats plural correctly', () => {
      expect(tp('common.words', 2)).toBe('2 Words');
      expect(tp('common.words', 10)).toBe('10 Words');
      expect(tp('common.words', 100)).toBe('100 Words');
      expect(tp('common.words', 999)).toBe('999 Words');
    });

    it('handles string counts', () => {
      expect(tp('common.words', '0')).toBe('No Words');
      expect(tp('common.words', '1')).toBe('1 Word');
      expect(tp('common.words', '2')).toBe('2 Words');
    });

    it('throws when count is null or undefined', () => {
      expect(() => tp('common.words', null)).toThrow('Count is required for pluralization key: common.words');
      expect(() => tp('common.words', undefined)).toThrow('Count is required for pluralization key: common.words');
    });

    it('throws when count is invalid', () => {
      expect(() => tp('common.words', 'invalid')).toThrow('Invalid count for pluralization key: common.words, got: invalid');
      expect(() => tp('common.words', 'abc')).toThrow('Invalid count for pluralization key: common.words, got: abc');
    });

    it('passes additional values through with educational context', () => {
      expect(tp('test.vocabulary', 0, { category: 'advanced' })).toBe('No words in advanced vocabulary');
      expect(tp('test.vocabulary', 1, { category: 'basic' })).toBe('1 word in basic vocabulary');
      expect(tp('test.vocabulary', 15, { category: 'intermediate' })).toBe('15 words in intermediate vocabulary');
    });

    it('handles multiple variable types in educational context', () => {
      expect(tp('test.etymology', 0, { language: 'Latin' })).toBe('No Latin origins found');
      expect(tp('test.etymology', 1, { language: 'Greek' })).toBe('1 Greek origin found');
      expect(tp('test.etymology', 7, { language: 'French' })).toBe('7 French origins found');
    });

    it('works with complex educational data', () => {
      expect(tp('test.learning', 0, { level: 'beginner', progress: 0 })).toBe('Difficulty: beginner, Progress: 0%');
      expect(tp('test.learning', 1, { level: 'intermediate', progress: 25 })).toBe('Difficulty: intermediate, Progress: 25%');
      expect(tp('test.learning', 50, { level: 'advanced', progress: 85 })).toBe('Difficulty: advanced, Progress: 85%, Words: 50');
    });

    it('demonstrates correct pluralization for dynamic content', () => {
      expect(tp('stats.least_common_letter', 0)).toBe('Least Common Letter (No Words)');
      expect(tp('stats.least_common_letter', 1)).toBe('Least Common Letter (1 Word)');
      expect(tp('stats.least_common_letter', 25)).toBe('Least Common Letter (25 Words)');
    });
  });
});