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

/**
 * Word-level enrichment fetched or derived at add-word time and stored in the
 * committed word JSON. Distinct from per-definition adapter data: every field
 * applies to the headword as a whole, is optional, and self-hides when absent.
 * Related-word lists hold word strings only (no scores). See buildWordData.
 */
export interface WordEnrichment {
  synonyms?: string[];
  antonyms?: string[];
  related?: string[];
  // Headword pronunciation respelling captured from the dictionary adapter
  pronunciation?: string;
  // Fully-constructed audio file URL for a native <audio> element
  audio?: string;
  // Etymology / origin text, markup stripped
  etymology?: string;
}

/** A single displayable sense of a word (one slide in the senses slider). */
export interface WordSense {
  partOfSpeech: string;
  text: string;
  // Up to MAX_SENSE_EXAMPLES example sentences for this sense (may be empty).
  examples: string[];
}

// Our main word file structure (adapter-agnostic)
export interface WordData {
  word: string;
  date: string; // YYYYMMDD format
  adapter: string; // Which dictionary adapter was used
  data: DictionaryDefinition[];
  // Optional word-level enrichment (WordNet relations + adapter headword capture)
  enrichment?: WordEnrichment;
  // Optionally store the raw API response for debugging or migration
  rawData?: unknown;
  // Flag to indicate if the word's capitalization should be preserved in display
  preserveCase?: boolean;
}

/**
 * Result of a build-time word-frequency lookup (SUBTLEX). Computed per build
 * from the word string, never stored. `zipf`/`count` are null when out of
 * dataset; OOV words fall into the rarest band.
 */
export interface FrequencyResult {
  band: 'common' | 'uncommon' | 'rare' | 'very-rare';
  zipf: number | null;
  count: number | null;
  inDataset: boolean;
}

/**
 * Result of a build-time pronunciation lookup (CMU Pronouncing Dictionary).
 * Computed per build from the word string, never stored. Null when the word is
 * not in the dictionary.
 */
export interface PronunciationResult {
  // Primary ARPABET transcription, e.g. "K AE1 T"
  arpabet: string;
  // IPA rendering with primary stress mark, e.g. "ˈkæt"
  ipa: string;
  // Per-syllable stress digits, e.g. "1" or "2-0-1-0-0"
  stress: string;
  // Authoritative syllable count (stress-bearing vowel phonemes)
  syllableCount: number;
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
