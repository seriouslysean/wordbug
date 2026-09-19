import crypto from 'node:crypto';

import type {
  WordAdjacentResult,
  WordData,
  WordGroupByLengthResult,
  WordGroupByPartOfSpeechResult,
  WordGroupByYearResult,
} from '#types';
import { isBasePartOfSpeech } from '#constants/parts-of-speech';
import { HOMEPAGE_PREVIOUS_WORDS, MAX_PAST_WORDS_DISPLAY } from '#constants/text-patterns';
import { getMonthSlugFromDate, getTodayYYYYMMDD } from '#utils/date-utils';
import {
  findCurrentWord,
  getPreviousWords,
  getAvailableYears,
  getAvailableLengths,
  getWordsByYear,
  getAvailableMonths,
  getAvailableLetters,
  getAvailablePartsOfSpeech,
  findValidDefinition,
  getWordsByLength as getWordsByLengthPure,
  getWordsByLetter as getWordsByLetterPure,
  getWordsByPartOfSpeech as getWordsByPartOfSpeechPure,
  groupWordsByYear as groupWordsByYearPure,
  groupWordsByLength as groupWordsByLengthPure,
  groupWordsByLetter as groupWordsByLetterPure,
  groupWordsByPartOfSpeech as groupWordsByPartOfSpeechPure,
} from '#utils/word-data-utils';
import { getErrorMessage } from '#utils/text-utils';
import { isWordData } from '#utils/stored-word-validation';
import {
  getLetterStats,
  getWordStats,
  getLetterPatternStats,
  getWordEndingStats,
  getCurrentStreakStats,
  getAntiStreakStats,
  getChronologicalMilestones
} from '#astro-utils/word-stats-utils';
import { logger } from '#astro-utils/logger';

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
      const wordData: WordData = {
        ...entry.data,
        date: extractedDate || entry.data.date,
      };
      if (!isWordData(wordData)) {
        throw new Error(`Invalid word data for "${entry.data.word}" in ${entry.id}`);
      }
      return wordData;
    })
    .toSorted((a, b) => b.date.localeCompare(a.date));
}

/**
 * Shared utility to extract definition and part of speech from word data
 * Handles the array structure of word.data consistently across components
 */
export function extractWordDefinition(wordData: WordData): { definition: string; partOfSpeech: string } {
  if (!wordData?.data) {
    return { definition: '', partOfSpeech: '' };
  }

  const validDefinition = findValidDefinition(wordData.data);

  if (validDefinition) {
    return {
      definition: validDefinition.text,
      partOfSpeech: validDefinition.partOfSpeech,
    };
  }

  return { definition: '', partOfSpeech: '' };
}

/**
 * All words loaded with consistent sorting across environments
 */
const wordCache: { value: WordData[] | null } = { value: null };

async function getAllWords(): Promise<WordData[]> {
  if (wordCache.value === null) {
    try {
      wordCache.value = await getWordsFromCollection();
      logger.info('Loaded words successfully', { count: wordCache.value.length });
    } catch (error) {
      logger.error('Failed to load words', { error: getErrorMessage(error) });
      throw error;
    }
  }
  return wordCache.value;
}

export const allWords = await getAllWords();

/**
 * All available years from the loaded collection
 */
export const availableYears = getAvailableYears(allWords);

/**
 * All available word lengths from the loaded collection
 */
export const availableLengths = getAvailableLengths(allWords);

/**
 * All available starting letters from the loaded collection
 */
export const availableLetters = getAvailableLetters(allWords);

/**
 * All available parts of speech from the loaded collection
 */
export const availablePartsOfSpeech = getAvailablePartsOfSpeech(allWords);

/**
 * Lowercased set of every word in the collection, for O(1) "do we have a page
 * for this word?" checks (e.g. linking enrichment synonyms to their own pages).
 */
export const corpusWordSet = new Set(allWords.map(word => word.word.toLowerCase()));

/**
 * Get words from a specific year using the loaded collection
 */
export const getWordsForYear = (year: string): WordData[] => getWordsByYear(year, allWords);

/**
 * Get available months for a specific year using the loaded collection
 */
export const getAvailableMonthsForYear = (year: string): string[] => getAvailableMonths(year, allWords);

/**
 * Pre-computed word statistics from the loaded collection
 */
export const wordStats = getWordStats(allWords);

/**
 * Pre-computed letter commonness (words containing each letter) from the loaded collection
 */
export const letterStats = getLetterStats(allWords);

/**
 * Pre-computed letter pattern statistics from the loaded collection
 */
export const letterPatternStats = getLetterPatternStats(allWords);

/**
 * Pre-computed word ending statistics from the loaded collection
 */
export const wordEndingStats = getWordEndingStats(allWords);

/**
 * Pre-computed streak statistics from the loaded collection
 */
export const streakStats = getCurrentStreakStats(allWords);

/**
 * Pre-computed anti-streak statistics from the loaded collection
 */
export const antiStreakStats = getAntiStreakStats(allWords);

/**
 * Pre-computed milestone words from the loaded collection
 */
export const milestoneWords = getChronologicalMilestones(allWords);

/**
 * Retrieves the current word that should be displayed based on today's date.
 * Returns the most recent word with a date less than or equal to today.
 * Falls back to the first available word if none match the date criteria.
 *
 * @param [words=allWords] - Array of word data to search through
 * @returns The current word data that should be displayed, or null if no words are available
 */
export const getCurrentWord = (words: WordData[] = allWords): WordData | null => {
  if (!words.length) {
    logger.error('No word data available in the system');
    return null;
  }

  // Local date, matching add-word and the streak stats; toISOString() is UTC and disagrees near midnight
  return findCurrentWord(words, getTodayYYYYMMDD());
};

/**
 * The homepage's current word and the previous words listed below it.
 */
export const getHomepageWords = (words: WordData[] = allWords): { currentWord: WordData | null; previousWords: WordData[] } => {
  const currentWord = getCurrentWord(words);
  return { currentWord, previousWords: getPreviousWords(words, currentWord, HOMEPAGE_PREVIOUS_WORDS) };
};

/**
 * Retrieves up to 5 words that occurred before the specified date.
 * Useful for showing recent word history or navigation context.
 *
 * @param currentDate - Reference date in YYYYMMDD format to find words before
 * @param [words=allWords] - Array of word data to search through
 * @returns Array of up to 5 word entries that occurred before the given date
 */
export const getPastWords = (currentDate: string, words: WordData[] = allWords): WordData[] => {
  if (!currentDate) {
    return [];
  }
  return words
    .filter(word => word.date < currentDate)
    .slice(0, MAX_PAST_WORDS_DISPLAY);
};

/**
 * Finds and returns the word data for a specific date.
 * Returns null if no word exists for the given date or if date is invalid.
 *
 * @param date - Date to search for in YYYYMMDD format
 * @param [words=allWords] - Array of word data to search through
 * @returns Word data for the specified date, or null if not found
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
 * @param date - Reference date in YYYYMMDD format to find adjacent words for
 * @param [words=allWords] - Array of word data to search through
 * @returns Object containing previousWord and nextWord, or null if not found
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
 * Retrieves all words that occurred within a specific month of a given year.
 * Useful for generating monthly archives.
 *
 * @param year - Year to filter by (YYYY format)
 * @param month - Month to filter by (MM format)
 * @param [words=allWords] - Array of word data to search through
 * @returns Array of word data entries from the specified month and year
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
 * @param year - Year to filter by (YYYY format)
 * @param [words=allWords] - Array of word data to group
 * @returns Object with month slugs as keys and word arrays as values
 */
export const groupWordsByMonth = (year: string, words: WordData[] = allWords): { [monthSlug: string]: WordData[] } => {
  const groups = Object.groupBy(
    words.filter(word => word.date.startsWith(year)),
    word => getMonthSlugFromDate(word.date),
  );
  return Object.fromEntries(
    Object.entries(groups).map(([key, value]) => [key, value ?? []]),
  );
};

/**
 * Generates a SHA-256 hash from a list of words and their count.
 * Useful for creating cache keys or detecting changes in word datasets.
 * Words are sorted alphabetically before hashing to ensure consistent results.
 *
 * @param words - Array of word strings to hash
 * @returns SHA-256 hash in hexadecimal format
 */
export const generateWordDataHash = (words: string[]): string => {
  const sorted = words.toSorted();
  const input = `${sorted.length}:${sorted.join(',')}`;
  return crypto.createHash('sha256').update(input).digest('hex');
};

/**
 * Groups an array of word data by year for organizing and statistical analysis.
 * Creates an object where keys are years (YYYY) and values are arrays of words from that year.
 *
 * @param words - Array of word data to group by year
 * @returns Object with years as keys and word arrays as values
 */
export const groupWordsByYear = (words: WordData[]): WordGroupByYearResult => {
  const groups = groupWordsByYearPure(words);
  return Object.fromEntries(
    Object.entries(groups).map(([key, value]) => [key, value ?? []]),
  );
};

/**
 * Groups an array of word data by length.
 * Creates an object where keys are word lengths and values are arrays of words from that length.
 * Keys are returned in ascending numeric order.
 *
 * @param words - Array of word data to group by length
 * @returns Object with lengths as keys and word arrays as values, sorted by length
 */
export const groupWordsByLength = (words: WordData[]): WordGroupByLengthResult => {
  const groups = groupWordsByLengthPure(words);
  return Object.fromEntries(
    Object.entries(groups)
      .toSorted(([a], [b]) => Number(a) - Number(b))
      .map(([key, value]) => [key, value ?? []]),
  );
};

/**
 * Retrieves all words that match a specific length.
 *
 * @param length - Word length to filter by
 * @param [words=allWords] - Array of word data to search through
 * @returns Array of word data entries with the specified length
 */
export const getWordsByLength = (length: number, words: WordData[] = allWords): WordData[] => {
  return getWordsByLengthPure(length, words);
};

/**
 * Groups words by their first letter
 *
 * @param words - Array of word data to group
 * @returns Object with letter keys and word arrays
 */
export const groupWordsByLetter = (words: WordData[]): Record<string, WordData[]> => {
  const alphabeticWords = words.filter(word => /^[a-z]/i.test(word.word));
  const groups = groupWordsByLetterPure(alphabeticWords);
  return Object.fromEntries(
    Object.entries(groups)
      .toSorted(([a], [b]) => a.localeCompare(b))
      .map(([letter, letterWords]) => [letter, (letterWords ?? []).toSorted((a, b) => a.word.localeCompare(b.word))])
  );
};

/**
 * Retrieves all words that start with a specific letter
 *
 * @param letter - Letter to filter by (case-insensitive)
 * @param [words=allWords] - Array of word data to search through
 * @returns Array of word data entries starting with the specified letter
 */
export const getWordsByLetter = (letter: string, words: WordData[] = allWords): WordData[] => {
  return getWordsByLetterPure(letter, words);
};

/**
 * Groups words by their part of speech for the browse pages: base parts of
 * speech only, keys and words in alphabetical order.
 *
 * @param words - Array of word data to group
 * @returns Object with part of speech keys and word arrays
 */
export const groupWordsByPartOfSpeech = (words: WordData[]): WordGroupByPartOfSpeechResult => {
  const groups = groupWordsByPartOfSpeechPure(words);
  return Object.fromEntries(
    Object.entries(groups)
      .filter(([pos]) => isBasePartOfSpeech(pos))
      .toSorted(([a], [b]) => a.localeCompare(b))
      .map(([pos, posWords]) => [pos, (posWords ?? []).toSorted((a, b) => a.word.localeCompare(b.word))])
  );
};

/**
 * Retrieves all words that have a specific part of speech
 *
 * @param partOfSpeech - Part of speech to filter by (will be normalized)
 * @param [words=allWords] - Array of word data to search through
 * @returns Array of word data entries with the specified part of speech
 */
export const getWordsByPartOfSpeech = (partOfSpeech: string, words: WordData[] = allWords): WordData[] => {
  return getWordsByPartOfSpeechPure(partOfSpeech, words);
};
