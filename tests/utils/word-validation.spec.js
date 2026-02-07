import { describe, expect, it } from 'vitest';

import { isValidDictionaryData } from '#utils/word-validation';

describe('word-validation', () => {
  describe('isValidDictionaryData', () => {
    it('validates array with valid dictionary definitions', () => {
      const validData = [
        {
          text: 'A test definition',
          partOfSpeech: 'noun'
        },
        {
          text: 'To test something',
          partOfSpeech: 'verb'
        }
      ];

      expect(isValidDictionaryData(validData)).toBe(true);
    });

    it('validates array with entries having only text', () => {
      const validData = [
        {
          text: 'A definition with text only'
        }
      ];

      expect(isValidDictionaryData(validData)).toBe(true);
    });

    it('validates array with entries having only partOfSpeech', () => {
      const validData = [
        {
          partOfSpeech: 'noun'
        }
      ];

      expect(isValidDictionaryData(validData)).toBe(true);
    });

    it('rejects empty array', () => {
      expect(isValidDictionaryData([])).toBe(false);
    });

    it('rejects non-array input', () => {
      expect(isValidDictionaryData(null)).toBe(false);
      expect(isValidDictionaryData(undefined)).toBe(false);
      expect(isValidDictionaryData('string')).toBe(false);
      expect(isValidDictionaryData(123)).toBe(false);
      expect(isValidDictionaryData({})).toBe(false);
    });

    it('rejects array with entries missing both text and partOfSpeech', () => {
      const invalidData = [
        {
          someOtherField: 'value'
        }
      ];

      expect(isValidDictionaryData(invalidData)).toBe(false);
    });

    it('rejects array with entries having empty text and partOfSpeech', () => {
      const invalidData = [
        {
          text: '',
          partOfSpeech: '  '
        }
      ];

      expect(isValidDictionaryData(invalidData)).toBe(false);
    });

    it('accepts array with entries having non-string text if partOfSpeech is valid', () => {
      const validData = [
        {
          text: 123, // not a string
          partOfSpeech: 'noun' // but this is valid
        }
      ];

      expect(isValidDictionaryData(validData)).toBe(true);
    });

    it('accepts array with entries having non-string partOfSpeech if text is valid', () => {
      const validData = [
        {
          text: 'Valid text',
          partOfSpeech: 456 // not a string, but text is valid
        }
      ];

      expect(isValidDictionaryData(validData)).toBe(true);
    });

    it('accepts mixed array where at least one entry is valid', () => {
      const mixedData = [
        {
          invalidField: 'value'
        },
        {
          text: 'Valid definition'
        }
      ];

      expect(isValidDictionaryData(mixedData)).toBe(true);
    });

    it('handles whitespace in text and partOfSpeech', () => {
      const validData = [
        {
          text: '  Valid text with whitespace  ',
          partOfSpeech: '  noun  '
        }
      ];

      expect(isValidDictionaryData(validData)).toBe(true);
    });

    it('rejects array with only whitespace in text and partOfSpeech', () => {
      const invalidData = [
        {
          text: '   ',
          partOfSpeech: '\t\n  '
        }
      ];

      expect(isValidDictionaryData(invalidData)).toBe(false);
    });
  });
});