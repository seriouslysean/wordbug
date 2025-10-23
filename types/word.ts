/**
 * Word data types - Our internal data structures
 */

import type { DictionaryDefinition, SourceMeta } from '~types';

// Our processed word data after transformation
export interface WordProcessedData {
  partOfSpeech: string;
  definition: string;
  meta: SourceMeta | null;
}

// Our main word file structure (adapter-agnostic)
export interface WordData {
  word: string; // Lowercase version for duplicate checking and compatibility
  displayWord?: string; // Original capitalization for display (proper nouns, custom caps)
  date: string; // YYYYMMDD format
  adapter: string; // Which dictionary adapter was used
  data: DictionaryDefinition[];
  // Optionally store the raw API response for debugging or migration
  rawData?: unknown;
}

// Word statistics types
export interface WordLengthStat {
  word: string;
  length: number;
}

export interface WordStatsResult {
  longest: WordData | null;
  shortest: WordData | null;
  longestPalindrome: WordData | null;
  shortestPalindrome: WordData | null;
  letterFrequency: Record<string, number>;
}

export type WordLetterStatsResult = Array<[string, number]>;

export interface WordMilestoneResult {
  25: WordData | null;
  50: WordData | null;
  100: WordData | null;
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

export interface WordGroupByYearResult {
  [year: string]: WordData[];
}

export interface WordGroupByLengthResult {
  [length: number]: WordData[];
}

export interface WordGroupByPartOfSpeechResult {
  [partOfSpeech: string]: WordData[];
}

export interface WordFileGlobImport {
  [path: string]: WordData | WordData[];
}

export interface WordMilestoneItem extends WordData {
  label: string;
}
