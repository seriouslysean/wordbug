/**
 * Word data types - Our internal data structures
 */

import type { DictionaryDefinition, SourceMeta } from '#types';

// Our processed word data after transformation
export interface WordProcessedData {
  partOfSpeech: string;
  definition: string;
  meta: SourceMeta | null;
}

// Our main word file structure (adapter-agnostic)
export interface WordData {
  word: string;
  date: string; // YYYYMMDD format
  adapter: string; // Which dictionary adapter was used
  data: DictionaryDefinition[];
  // Optionally store the raw API response for debugging or migration
  rawData?: unknown;
  // Flag to indicate if the word's capitalization should be preserved in display
  preserveCase?: boolean;
}

// Word statistics types
export interface WordStatsResult {
  longest: WordData | null;
  shortest: WordData | null;
  longestPalindrome: WordData | null;
  shortestPalindrome: WordData | null;
  letterFrequency: Record<string, number>;
}

export interface WordPatternStatsResult {
  startEndSame: WordData[];
  doubleLetters: WordData[];
  tripleLetters: WordData[];
  alphabetical: WordData[];
  palindromes: WordData[];
}

export interface WordEndingStatsResult {
  ing: WordData[];
  ed: WordData[];
  ly: WordData[];
  ness: WordData[];
  ful: WordData[];
  less: WordData[];
}

export interface WordStreakStatsResult {
  currentStreak: number;
  longestStreak: number;
  isActive: boolean;
}

export interface WordAntiStreakStatsResult {
  longestGap: number;
  gapStartWord: WordData | null;
  gapEndWord: WordData | null;
  gapStartDate: string | null;
  gapEndDate: string | null;
}

export interface WordAdjacentResult {
  previousWord: WordData | null;
  nextWord: WordData | null;
}

/**
 * Generic grouping of words keyed by some attribute (year, length, POS, letter).
 * Single shape replaces three near-identical aliases that diverged in name only.
 */
export type WordGrouping<K extends string | number> = Record<K, WordData[]>;

export type WordGroupByYearResult = WordGrouping<string>;
export type WordGroupByLengthResult = WordGrouping<number>;
export type WordGroupByPartOfSpeechResult = WordGrouping<string>;

export interface WordMilestoneItem extends WordData {
  label: string;
}
