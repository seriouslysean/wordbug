import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
 afterEach,beforeEach, describe, expect, it,
} from 'vitest';

import { isValidDictionaryData as isValidWordData } from '~utils/word-validation';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isValidDate = (date) => {
  if (!date) {
return false;
}
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) {
return false;
}
  const d = new Date(date);
  return d instanceof Date && !isNaN(d);
};

const isNotFutureDate = (date) => {
  const today = new Date().toISOString().split('T')[0];
  return date <= today;
};

const getAllWordsFromDir = (testWordsDir) => {
  if (!fs.existsSync(testWordsDir)) {
return [];
}

  const years = fs.readdirSync(testWordsDir).filter(dir => /^\d{4}$/.test(dir));
  return years.flatMap(year => {
    const yearDir = path.join(testWordsDir, year);
    return fs.readdirSync(yearDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        try {
          return JSON.parse(fs.readFileSync(path.join(yearDir, file), 'utf-8'));
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  });
};

const checkExistingWordByName = (word, testWordsDir) => {
  const lowerWord = word.toLowerCase();
  const words = getAllWordsFromDir(testWordsDir);
  return words.find(w => w.word?.toLowerCase() === lowerWord) || null;
};

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

  describe('Date validation functions', () => {
    describe('isValidDate function', () => {
      it('should accept valid date format', () => {
        expect(isValidDate('2025-01-01')).toBe(true);
        expect(isValidDate('2025-12-31')).toBe(true);
        expect(isValidDate('2024-02-29')).toBe(true);
      });

      it('should reject invalid date formats', () => {
        expect(isValidDate('2025/01/01')).toBe(false);
        expect(isValidDate('01-01-2025')).toBe(false);
        expect(isValidDate('2025-1-1')).toBe(false);
        expect(isValidDate('not-a-date')).toBe(false);
        expect(isValidDate('')).toBe(false);
        expect(isValidDate(null)).toBe(false);
        expect(isValidDate(undefined)).toBe(false);
      });

      it('should reject invalid dates', () => {
        expect(isValidDate('2025-13-01')).toBe(false);
        expect(isValidDate('2025-00-01')).toBe(false);
        expect(isValidDate('2025-01-00')).toBe(false);
      });
    });

    describe('isNotFutureDate function', () => {
      it(`should accept today's date`, () => {
        const today = new Date().toISOString().split('T')[0];
        expect(isNotFutureDate(today)).toBe(true);
      });

      it('should accept past dates', () => {
        expect(isNotFutureDate('2024-01-01')).toBe(true);
        expect(isNotFutureDate('2023-12-31')).toBe(true);
      });

      it('should reject future dates', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        expect(isNotFutureDate(tomorrowStr)).toBe(false);

        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const nextYearStr = nextYear.toISOString().split('T')[0];
        expect(isNotFutureDate(nextYearStr)).toBe(false);
      });
    });
  });

  describe('Word duplication validation', () => {
    let testWordsDir;

    beforeEach(() => {
      testWordsDir = path.join(__dirname, 'test-words');
      const year2025Dir = path.join(testWordsDir, '2025');
      fs.mkdirSync(year2025Dir, { recursive: true });
      const testWord1 = {
        word: 'test',
        date: '20250101',
        data: [{ word: 'test', text: 'A test word' }],
      };
      const testWord2 = {
        word: 'example',
        date: '20250102',
        data: [{ word: 'example', text: 'An example word' }],
      };

      fs.writeFileSync(
        path.join(year2025Dir, '20250101.json'),
        JSON.stringify(testWord1, null, 2),
      );
      fs.writeFileSync(
        path.join(year2025Dir, '20250102.json'),
        JSON.stringify(testWord2, null, 2),
      );
    });

    afterEach(() => {
      if (fs.existsSync(testWordsDir)) {
        fs.rmSync(testWordsDir, { recursive: true });
      }
    });

    describe('checkExistingWordByName function', () => {
      it('should find existing word (case insensitive)', () => {
        const result = checkExistingWordByName('test', testWordsDir);
        expect(result).toBeTruthy();
        expect(result.word).toBe('test');
        expect(result.date).toBe('20250101');
      });

      it('should find existing word with different case', () => {
        const result = checkExistingWordByName('TEST', testWordsDir);
        expect(result).toBeTruthy();
        expect(result.word).toBe('test');
        expect(result.date).toBe('20250101');
      });

      it('should return null for non-existent word', () => {
        const result = checkExistingWordByName('nonexistent', testWordsDir);
        expect(result).toBeNull();
      });

      it('should return null for empty words directory', () => {
        const emptyDir = path.join(__dirname, 'empty-words');
        const result = checkExistingWordByName('test', emptyDir);
        expect(result).toBeNull();
      });
    });
  });
});
