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

/**
 * One run of a definition as a page shows it: plain text, or the text of a
 * cross-reference and where it links. Never markup; see toDefinitionSegments.
 */
export type DefinitionSegment =
  | { type: 'text'; text: string }
  | { type: 'reference'; text: string; url: string };

/** A single displayable sense of a word (one slide in the senses slider). */
export interface WordSense {
  partOfSpeech: string;
  segments: DefinitionSegment[];
  // Up to MAX_SENSE_EXAMPLES example sentences for this sense (may be empty).
  examples: string[];
}

// Our main word file structure (adapter-agnostic)
export interface WordData {
  word: string;
  // YYYYMMDD format
  date: string;
  // Which dictionary adapter was used
  adapter: string;
  data: DictionaryDefinition[];
  // Optional word-level enrichment (WordNet relations + adapter headword capture)
  enrichment?: WordEnrichment;
  // Optionally store the raw API response for debugging or migration
  rawData?: unknown;
  // Flag to indicate if the word's capitalization should be preserved in display
  preserveCase?: boolean;
}

/**
 * One row of the /words.json index the client scripts fetch: the headword and
 * its display-formatted featured date.
 */
export interface WordIndexEntry {
  word: string;
  date: string;
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
  // Words containing each letter (once per word), not total occurrences
  letterFrequency: Record<string, number>;
}

// Letter commonness by words containing the letter. See getLetterStats.
export interface LetterStats {
  // [letter, words containing it], most common first
  ranked: Array<[string, number]>;
  mostCommon: string;
  leastCommon: string;
  mostCommonCount: number;
  leastCommonCount: number;
  wordsWithMostCommon: WordData[];
  wordsWithLeastCommon: WordData[];
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
 * Partial because a key with no words has no bucket, matching Object.groupBy.
 */
export type WordGrouping<K extends string | number> = Partial<Record<K, WordData[]>>;

/**
 * A grouping whose every key holds a bucket. The Astro wrappers return this:
 * they rebuild the object from its entries, so no key is ever bucketless.
 */
export type DenseWordGrouping<K extends string | number> = Record<K, WordData[]>;

export type WordGroupByYearResult = DenseWordGrouping<string>;
export type WordGroupByLengthResult = DenseWordGrouping<number>;
export type WordGroupByPartOfSpeechResult = DenseWordGrouping<string>;

export interface WordMilestoneItem extends WordData {
  label: string;
}
