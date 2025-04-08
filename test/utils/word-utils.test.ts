import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getCurrentWord, getPastWords, getWordByDate, getAdjacentWords, getWordDetails } from '~utils/word-utils.js';

// Mock fs and path modules
vi.mock('fs');
vi.mock('url', () => ({
    fileURLToPath: () => '/mock/path'
}));
vi.mock('path', () => {
    const mockPath = {
        join: (...args) => args.join('/'),
        dirname: () => '/mock/dir'
    };
    return {
        ...mockPath,
        default: mockPath
    };
});

describe('word-utils', () => {
  const mockWords = [
    {
      word: 'test1',
      date: '20240320',
      meanings: [{
        partOfSpeech: 'noun',
        definitions: [{ definition: 'A test definition' }]
      }]
    },
    {
      word: 'test2',
      date: '20240319',
      meanings: [{
        partOfSpeech: 'verb',
        definitions: [{ definition: 'Another test definition.' }]
      }]
    },
    {
      word: 'test3',
      date: '20240318',
      meanings: [{
        partOfSpeech: 'adjective',
        definitions: [{ definition: 'Yet another test definition' }]
      }]
    }
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();

    // Mock filesystem operations
    fs.readdirSync.mockImplementation((dirPath) => {
      if (dirPath.endsWith('data/words')) return ['2024'];
      if (dirPath.endsWith('words/2024')) return ['20240320.json', '20240319.json', '20240318.json'];
      return [];
    });

    fs.existsSync.mockImplementation((filePath) => {
      return filePath.includes('words/2024') || filePath.endsWith('.json');
    });

    fs.readFileSync.mockImplementation((filePath) => {
      const date = filePath.split('/').pop()?.replace('.json', '');
      const word = mockWords.find(w => w.date === date);
      if (!word) throw new Error(`No word found for date ${date}`);
      return JSON.stringify(word);
    });

    // Mock process.cwd() and __dirname
    vi.spyOn(process, 'cwd').mockReturnValue('/test');
    vi.mock('url', () => ({
      fileURLToPath: () => '/test/src/utils/word-utils.js'
    }));
    vi.mock('path', () => ({
      dirname: () => '/test/src/utils',
      join: (...args) => args.join('/'),
      default: {
        dirname: () => '/test/src/utils',
        join: (...args) => args.join('/')
      }
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getCurrentWord', () => {
    it('returns the most recent word not after today', () => {
      const today = new Date('2024-03-20');
      vi.setSystemTime(today);

      const result = getCurrentWord();
      expect(result.word).toBe('test1');
      expect(result.date).toBe('20240320');
    });

    it('returns the first word if all words are in the future', () => {
      const pastDate = new Date('2024-03-17');
      vi.setSystemTime(pastDate);

      const result = getCurrentWord();
      expect(result.word).toBe('test1');
    });

    it('throws error when no words are available', () => {
      fs.readdirSync.mockReturnValue([]);
      expect(() => getCurrentWord()).toThrow('No word data available');
    });

    it('handles file system errors', () => {
      fs.readdirSync.mockImplementation(() => {
        throw new Error('File system error');
      });
      expect(() => getCurrentWord()).toThrow('File system error');
    });
  });

  describe('getPastWords', () => {
    it('returns past words before the given date', () => {
      const result = getPastWords('20240320');
      expect(result).toHaveLength(2);
      expect(result[0].word).toBe('test2');
      expect(result[1].word).toBe('test3');
    });

    it('returns empty array for invalid date', () => {
      expect(getPastWords()).toEqual([]);
      expect(getPastWords(null)).toEqual([]);
      expect(getPastWords('')).toEqual([]);
    });

    it('limits to 5 past words', () => {
      const manyWords = Array.from({ length: 10 }, (_, i) => ({
        word: `word${i}`,
        date: `2024031${i}`
      }));
      fs.readdirSync.mockImplementation(() => ['2024']);
      fs.readFileSync.mockImplementation(() => JSON.stringify(manyWords[0]));

      const result = getPastWords('20240320');
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('handles file system errors gracefully', () => {
      fs.readdirSync.mockImplementation(() => {
        throw new Error('File system error');
      });
      expect(getPastWords('20240320')).toEqual([]);
    });
  });

  describe('getWordByDate', () => {
    it('returns word for exact date match', () => {
      const result = getWordByDate('20240319');
      expect(result.word).toBe('test2');
    });

    it('returns null for non-existent date', () => {
      const result = getWordByDate('20240101');
      expect(result).toBeNull();
    });

    it('returns null for invalid date', () => {
      expect(getWordByDate()).toBeNull();
      expect(getWordByDate(null)).toBeNull();
      expect(getWordByDate('')).toBeNull();
    });

    it('handles file system errors', () => {
      fs.readdirSync.mockImplementation(() => {
        throw new Error('File system error');
      });
      expect(getWordByDate('20240319')).toBeNull();
    });
  });

  describe('getAdjacentWords', () => {
    it('returns previous and next words', () => {
      const result = getAdjacentWords('20240319');
      expect(result.previousWord.word).toBe('test3');
      expect(result.nextWord.word).toBe('test1');
    });

    it('handles first word in list', () => {
      const result = getAdjacentWords('20240320');
      expect(result.previousWord.word).toBe('test2');
      expect(result.nextWord).toBeNull();
    });

    it('handles last word in list', () => {
      const result = getAdjacentWords('20240318');
      expect(result.previousWord).toBeNull();
      expect(result.nextWord.word).toBe('test2');
    });

    it('returns null for both when date not found', () => {
      const result = getAdjacentWords('20240101');
      expect(result.previousWord).toBeNull();
      expect(result.nextWord).toBeNull();
    });

    it('handles invalid input', () => {
      expect(getAdjacentWords()).toEqual({ previousWord: null, nextWord: null });
      expect(getAdjacentWords(null)).toEqual({ previousWord: null, nextWord: null });
      expect(getAdjacentWords('')).toEqual({ previousWord: null, nextWord: null });
    });

    it('handles file system errors', () => {
      fs.readdirSync.mockImplementation(() => {
        throw new Error('File system error');
      });
      expect(getAdjacentWords('20240319')).toEqual({ previousWord: null, nextWord: null });
    });
  });

  describe('getWordDetails', () => {
    it('extracts word details correctly', () => {
      const result = getWordDetails(mockWords[0]);
      expect(result.partOfSpeech).toBe('noun.');
      expect(result.definition).toBe('A test definition.');
    });

    it('handles missing meanings or definitions', () => {
      expect(getWordDetails({})).toEqual({ partOfSpeech: '', definition: '' });
      expect(getWordDetails({ meanings: [] })).toEqual({ partOfSpeech: '', definition: '' });
      expect(getWordDetails({ meanings: [{}] })).toEqual({ partOfSpeech: '', definition: '' });
      expect(getWordDetails({ meanings: [{ definitions: [] }] })).toEqual({ partOfSpeech: '', definition: '' });
    });

    it('handles null input', () => {
      expect(getWordDetails(null)).toEqual({ partOfSpeech: '', definition: '' });
      expect(getWordDetails(undefined)).toEqual({ partOfSpeech: '', definition: '' });
    });

    it('handles definition already ending with period', () => {
      const result = getWordDetails(mockWords[1]);
      expect(result.definition).toBe('Another test definition.');
      expect(result.definition.match(/\.+$/)[0].length).toBe(1);
    });

    it('handles malformed word objects', () => {
      const malformed = {
        meanings: [
          { partOfSpeech: 'noun' }, // missing definitions
          { definitions: [{ definition: 'test' }] }, // missing partOfSpeech
          null, // null meaning
          undefined // undefined meaning
        ]
      };
      expect(getWordDetails(malformed)).toEqual({ partOfSpeech: 'noun.', definition: '' });
    });
  });
});
