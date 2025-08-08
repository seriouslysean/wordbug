import crypto from 'crypto';

import { getAdapter } from '~adapters';
import type {
  WordAdjacentResult,
  WordData,
  WordGroupByLengthResult,
  WordGroupByYearResult,
  WordProcessedData,
} from '~types/word';
import { getMonthSlugFromDate } from '~utils/date-utils';
import { logger } from '~utils-client/logger';

/**
 * Get words from Astro Content Collections
 * Use this in all Astro components and pages
 */
export async function getWordsFromCollection(): Promise<WordData[]> {
  const { getCollection } = await import('astro:content');
  const words = await getCollection('words');

  return words
    .map(entry => {
      const extractedDate = entry.id.includes('/') ? entry.id.split('/').pop() : entry.id;
      return {
        ...entry.data,
        date: extractedDate || entry.data.date,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Shared utility to extract definition and part of speech from word data
 * Handles the array structure of word.data consistently across components
 */
export function extractWordDefinition(wordData: WordData): { definition: string; partOfSpeech: string } {
  if (!wordData?.data || !Array.isArray(wordData.data) || wordData.data.length === 0) {
    return { definition: '', partOfSpeech: '' };
  }

  const firstDefinition = wordData.data[0];
  return {
    definition: firstDefinition.text || '',
    partOfSpeech: firstDefinition.partOfSpeech || '',
  };
}

/**
 * All words loaded with consistent sorting across environments
 */
let _cachedWords: WordData[] | null = null;

async function getAllWords(): Promise<WordData[]> {
  if (_cachedWords === null) {
    try {
      _cachedWords = await getWordsFromCollection();
      logger.info('Loaded words successfully', { count: _cachedWords.length });
    } catch (error) {
      logger.error('Failed to load words', { error: (error as Error).message });
      _cachedWords = [];
    }
  }
  return _cachedWords;
}

export const allWords = await getAllWords();


/**
 * Processes raw word data into a standardized format for display.
 * Extracts part of speech, definition, and metadata using the current adapter.
 *
 * @param {WordData} wordData - Raw word data containing dictionary definitions
 * @returns {WordProcessedData} Processed word data with standardized fields for UI consumption
 */
export function getProcessedWord(wordData: WordData): WordProcessedData {
  const adapter = getAdapter();
  return adapter.transformWordData(wordData);
}

/**
 * Retrieves the current word that should be displayed based on today's date.
 * Returns the most recent word with a date less than or equal to today.
 * Falls back to the first available word if none match the date criteria.
 *
 * @param {WordData[]} [words=allWords] - Array of word data to search through
 * @returns {WordData | null} The current word data that should be displayed, or null if no words are available
 */
export const getCurrentWord = (words: WordData[] = allWords): WordData | null => {
  if (!words.length) {
    logger.error('No word data available in the system');
    return null;
  }

  const today = new Date();
  const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');

  const found = words.find(word => word.date <= dateString);

  return found || words[words.length - 1];
};

/**
 * Retrieves up to 5 words that occurred before the specified date.
 * Useful for showing recent word history or navigation context.
 *
 * @param {string} currentDate - Reference date in YYYYMMDD format to find words before
 * @param {WordData[]} [words=allWords] - Array of word data to search through
 * @returns {WordData[]} Array of up to 5 word entries that occurred before the given date
 */
export const getPastWords = (currentDate: string, words: WordData[] = allWords): WordData[] => {
  if (!currentDate) {
    return [];
  }
  return words
    .filter(word => word.date < currentDate)
    .slice(0, 5);
};

/**
 * Finds and returns the word data for a specific date.
 * Returns null if no word exists for the given date or if date is invalid.
 *
 * @param {string} date - Date to search for in YYYYMMDD format
 * @param {WordData[]} [words=allWords] - Array of word data to search through
 * @returns {WordData | null} Word data for the specified date, or null if not found
 */
export const getWordByDate = (date: string, words: WordData[] = allWords): WordData | null => {
  if (!date) {
    return null;
  }
  return words.find(word => word.date === date) || null;
};

/**
 * Gets the previous and next words relative to the given date for navigation purposes.
 * Previous word has an earlier date, next word has a later date.
 *
 * @param {string} date - Reference date in YYYYMMDD format to find adjacent words for
 * @param {WordData[]} [words=allWords] - Array of word data to search through
 * @returns {WordAdjacentResult} Object containing previousWord and nextWord, or null if not found
 */
export const getAdjacentWords = (date: string, words: WordData[] = allWords): WordAdjacentResult => {
  if (!date) {
    return {
      previousWord: null,
      nextWord: null,
    };
  }
  const currentIndex = words.findIndex(word => word.date === date);

  if (currentIndex === -1) {
    return {
      previousWord: null,
      nextWord: null,
    };
  }

  return {
    previousWord: words[currentIndex + 1] || null,
    nextWord: words[currentIndex - 1] || null,
  };
};

/**
 * Safely extracts and processes word details from raw word data.
 * Handles cases where word data might be incomplete or malformed.
 *
 * @param {WordData} word - Raw word data containing dictionary definitions
 * @returns {WordProcessedData} Processed word details with safe defaults for missing data
 */
export const getWordDetails = (word: WordData): WordProcessedData => {
  if (!word?.data) {
    return { partOfSpeech: '', definition: '', meta: null };
  }

  return getProcessedWord(word);
};


/**
 * Retrieves all words that occurred within a specific month of a given year.
 * Useful for generating monthly archives.
 *
 * @param {string} year - Year to filter by (YYYY format)
 * @param {string} month - Month to filter by (MM format)
 * @param {WordData[]} [words=allWords] - Array of word data to search through
 * @returns {WordData[]} Array of word data entries from the specified month and year
 */
export const getWordsByMonth = (
  year: string,
  month: string,
  words: WordData[] = allWords,
): WordData[] => {
  const monthStr = month.padStart(2, '0');
  return words.filter(word => word.date.startsWith(`${year}${monthStr}`));
};


/**
 * Groups words by month within a specific year.
 * Returns an object with month slugs as keys and word arrays as values.
 *
 * @param {string} year - Year to filter by (YYYY format)
 * @param {WordData[]} [words=allWords] - Array of word data to group
 * @returns {Object} Object with month slugs as keys and word arrays as values
 */
export const groupWordsByMonth = (year: string, words: WordData[] = allWords): { [monthSlug: string]: WordData[] } => {
  return words
    .filter(word => word.date.startsWith(year))
    .reduce((acc, word) => {
      const monthSlug = getMonthSlugFromDate(word.date);
      acc[monthSlug] = acc[monthSlug] || [];
      acc[monthSlug].push(word);
      return acc;
    }, {} as { [monthSlug: string]: WordData[] });
};

/**
 * Generates a SHA-256 hash from a list of words and their count.
 * Useful for creating cache keys or detecting changes in word datasets.
 * Words are sorted alphabetically before hashing to ensure consistent results.
 *
 * @param {string[]} words - Array of word strings to hash
 * @returns {string} SHA-256 hash in hexadecimal format
 */
export const generateWordDataHash = (words: string[]): string => {
  const sorted = [...words].sort();
  const input = `${sorted.length}:${sorted.join(',')}`;
  return crypto.createHash('sha256').update(input).digest('hex');
};

/**
 * Groups an array of word data by year for organizing and statistical analysis.
 * Creates an object where keys are years (YYYY) and values are arrays of words from that year.
 *
 * @param {WordData[]} words - Array of word data to group by year
 * @returns {WordGroupByYearResult} Object with years as keys and word arrays as values
 */
export const groupWordsByYear = (words: WordData[]): WordGroupByYearResult => {
  return words.reduce((acc, word) => {
    const year = word.date.substring(0, 4);
    acc[year] = acc[year] || [];
    acc[year].push(word);
    return acc;
  }, {} as WordGroupByYearResult);
};


/**
 * Groups an array of word data by length.
 * Creates an object where keys are word lengths and values are arrays of words from that length.
 * Keys are returned in ascending numeric order.
 *
 * @param {WordData[]} words - Array of word data to group by length
 * @returns {WordGroupByLengthResult} Object with lengths as keys and word arrays as values, sorted by length
 */
export const groupWordsByLength = (words: WordData[]): WordGroupByLengthResult => {
  const groups = words.reduce<WordGroupByLengthResult>((acc, word) => {
    const length = word.word.length;
    acc[length] = acc[length] || [];
    acc[length].push(word);
    return acc;
  }, {});

  return Object.fromEntries(
    Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b)),
  );
};

/**
 * Retrieves all words that match a specific length.
 *
 * @param {number} length - Word length to filter by
 * @param {WordData[]} [words=allWords] - Array of word data to search through
 * @returns {WordData[]} Array of word data entries with the specified length
 */
export const getWordsByLength = (length: number, words: WordData[] = allWords): WordData[] => {
  return words.filter(word => word.word.length === length);
};


