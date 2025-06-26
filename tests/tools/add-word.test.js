import { describe, it, expect } from 'vitest';
import { isValidWordData } from '../../tools/utils.js';

describe('add-word tool validation logic', () => {
  describe('isValidWordData function', () => {
    it('should reject empty objects (typical Wordnik response for invalid words)', () => {
      const emptyData = [
        { citations: [], exampleUses: [], labels: [], notes: [], relatedWords: [], textProns: [] },
        { citations: [], exampleUses: [], labels: [], notes: [], relatedWords: [], textProns: [] },
      ];

      expect(isValidWordData(emptyData)).toBe(false);
    });

    it('should accept valid word data with all fields', () => {
      const validData = [
        {
          word: 'magnificent',
          text: 'Splendid in appearance; grand',
          partOfSpeech: 'adjective',
        },
      ];

      expect(isValidWordData(validData)).toBe(true);
    });

    it('should accept data with only text field', () => {
      const dataWithText = [
        {
          text: 'A test definition',
          citations: [],
          exampleUses: [],
        },
      ];

      expect(isValidWordData(dataWithText)).toBe(true);
    });

    it('should accept data with only partOfSpeech field', () => {
      const dataWithPartOfSpeech = [
        {
          partOfSpeech: 'noun',
          citations: [],
          exampleUses: [],
        },
      ];

      expect(isValidWordData(dataWithPartOfSpeech)).toBe(true);
    });

    it('should accept data with only word field', () => {
      const dataWithWord = [
        {
          word: 'example',
          citations: [],
          exampleUses: [],
        },
      ];

      expect(isValidWordData(dataWithWord)).toBe(true);
    });

    it('should reject completely empty array', () => {
      const emptyArray = [];

      expect(isValidWordData(emptyArray)).toBe(false);
    });

    it('should reject null or undefined input', () => {
      expect(isValidWordData(null)).toBe(false);
      expect(isValidWordData(undefined)).toBe(false);
    });

    it('should reject non-array input', () => {
      expect(isValidWordData('not an array')).toBe(false);
      expect(isValidWordData({})).toBe(false);
      expect(isValidWordData(123)).toBe(false);
    });

    it('should handle mixed valid and invalid entries', () => {
      const mixedData = [
        { citations: [], exampleUses: [], labels: [] }, // Invalid entry
        { text: 'A valid definition' }, // Valid entry
      ];

      expect(isValidWordData(mixedData)).toBe(true);
    });
  });
});
