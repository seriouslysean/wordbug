/**
 * Word data types - Our internal data structures
 */

import type { DictionaryDefinition } from './adapters';

// Our processed word data after transformation
export interface WordProcessedData {
  partOfSpeech: string;
  definition: string;
  meta: WordMeta | null;
}

export interface WordMeta {
  attributionText: string;
  sourceDictionary?: string;
  sourceUrl: string;
}

// Our main word file structure (adapter-agnostic)
export interface WordData {
  word: string;
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
  longest: WordLengthStat | null;
  shortest: WordLengthStat | null;
  longestPalindrome: WordLengthStat | null;
  shortestPalindrome: WordLengthStat | null;
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

export interface WordAdjacentResult {
  previousWord: WordData | null;
  nextWord: WordData | null;
}

export interface WordGroupByYearResult {
  [year: string]: WordData[];
}

export interface WordFileGlobImport {
  [path: string]: WordData | WordData[];
}

export interface WordMilestoneItem extends WordData {
  label: string;
}
