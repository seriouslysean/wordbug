import { describe, expect, it } from 'vitest';

import { getOpenGraphLocale, t, tp } from '#utils/i18n-utils';

describe('i18n-utils', () => {
  describe('t', () => {
    it('returns simple translations', () => {
      expect(t('nav.home')).toBe('Home');
      expect(t('nav.stats')).toBe('Stats');
      expect(t('footer.powered_by')).toBe('Powered by words');
    });

    it('handles nested keys', () => {
      expect(t('stats.total_words')).toBe('Total Words');
      expect(t('stats.word_lengths')).toBe('Word Lengths');
      expect(t('stats.milestone_words')).toBe('Milestone Words');
    });

    it('supports variable interpolation', () => {
      expect(t('words.length_words', { length: 7 })).toBe('7-Letter Words');
      expect(t('words.words_starting_with', { letter: 'A' })).toBe('Words Starting with A');
      expect(t('home.description', { word: 'calm' })).toBe('Today\'s word is "calm".');
    });

    it('handles multiple variable interpolation', () => {
      expect(t('common.title_with_part_of_speech_other', { count: 3, value: 'noun' })).toBe('3 noun words');
    });

    it('does not choose a plural form: that is tp', () => {
      expect(() => t('stats.days', { count: 1 })).toThrow('Translation missing for key: stats.days');
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
      expect(() => t('words.length_words')).toThrow("Translation key 'words.length_words' requires variables but none were provided");
      expect(() => t('words.length_words', {})).toThrow("Missing required variable 'length' for translation key: words.length_words");
    });

    it('throws when interpolation values are null or undefined', () => {
      // @ts-expect-error undefined is a deliberate invalid runtime input.
      expect(() => t('words.length_words', { length: undefined })).toThrow("Variable 'length' is undefined or null for translation key: words.length_words");
      // @ts-expect-error null is a deliberate invalid runtime input.
      expect(() => t('words.length_words', { length: null })).toThrow("Variable 'length' is undefined or null for translation key: words.length_words");
    });

    it('allows zero and empty string values', () => {
      expect(t('words.length_words', { length: 0 })).toBe('0-Letter Words');
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

    it('gives a day count its own form for zero, one and many', () => {
      expect(tp('stats.days', 0)).toBe('0 Days');
      expect(tp('stats.days', 1)).toBe('1 Day');
      expect(tp('stats.days', 5)).toBe('5 Days');
    });

    it('pluralizes part-of-speech titles', () => {
      expect(tp('common.title_with_part_of_speech', 0, { value: 'interjection' })).toBe('No interjection words');
      expect(tp('common.title_with_part_of_speech', 1, { value: 'interjection' })).toBe('1 interjection word');
      expect(tp('common.title_with_part_of_speech', 2, { value: 'interjection' })).toBe('2 interjection words');
    });

    it('handles string counts', () => {
      expect(tp('common.words', '0')).toBe('No Words');
      expect(tp('common.words', '1')).toBe('1 Word');
      expect(tp('common.words', '2')).toBe('2 Words');
    });

    it('throws when count is null or undefined', () => {
      // @ts-expect-error null is a deliberate invalid runtime input.
      expect(() => tp('common.words', null)).toThrow('Count is required for pluralization key: common.words');
      // @ts-expect-error undefined is a deliberate invalid runtime input.
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

  // ogp.me: og:locale is language_TERRITORY and optional, defaulting to en_US
  describe('getOpenGraphLocale', () => {
    it.each([
      ['en-US', 'en_US'],
      ['pt-br', 'pt_BR'],
      // The script is no part of the format: replacing the first hyphen gave zh_Hant-TW
      ['zh-Hant-TW', 'zh_TW'],
    ])('gives %s as %s', (locale, expected) => {
      expect(getOpenGraphLocale(locale)).toBe(expected);
    });

    it.each([
      ['a language with no region', 'en'],
      ['a language and script with no region', 'zh-Hant'],
      ['a tag that is not BCP 47', 'en_US'],
      ['an empty tag', ''],
    ])('gives nothing for %s, so the tag is left out', (_, locale) => {
      expect(getOpenGraphLocale(locale)).toBeUndefined();
    });
  });
});
