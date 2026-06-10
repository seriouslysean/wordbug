/**
 * Text pattern constants for consistent usage across the application.
 * Used for word analysis, statistics, and filtering.
 */

/**
 * Common English word endings tracked by the application.
 * These suffixes are used for categorization and pattern analysis.
 */
export const COMMON_WORD_ENDINGS = ['ing', 'ed', 'ly', 'ness', 'ful', 'less'] as const;

/**
 * Minimum sequence length for alphabetical pattern detection (e.g., "abc", "def").
 */
export const MIN_ALPHABETICAL_SEQUENCE_LENGTH = 3;

/**
 * Maximum number of past words to display in navigation/history.
 */
export const MAX_PAST_WORDS_DISPLAY = 5;

/**
 * Maximum number of example sentences to display per sense (one slide) on a
 * word page. Examples render inside the senses slider, under each definition.
 */
export const MAX_SENSE_EXAMPLES = 2;

/**
 * Minimum corpus size before the word-connections graph is shown. Below this the
 * graph is too sparse to be meaningful, so small sites hide it; larger corpora
 * (e.g. mature downstream sites) surface it.
 */
export const WORD_GRAPH_MIN_WORDS = 25;

/**
 * Number of recent words to include in RSS feed.
 */
export const RSS_FEED_WORD_COUNT = 14;

/**
 * Milestone thresholds for chronological word tracking.
 * Used to mark significant word count achievements in the application.
 */
export const MILESTONES = {
  /** The first word in the collection */
  FIRST: 1,
  /** Early milestone markers (25th, 50th, 75th words) */
  EARLY: [25, 50, 75] as const,
  /** Century-based milestone interval (100, 200, 300, etc.) */
  CENTURY: 100,
} as const;

/**
 * Centralized regex patterns for consistent text analysis
 */
export const TEXT_PATTERNS = {
  // Letter patterns
  VOWELS: /[aeiou]/gi,
  CONSONANTS: /[bcdfghjklmnpqrstvwxyz]/gi,
  ALL_VOWELS: /^[aeiou]+$/i,
  ALL_CONSONANTS: /^[^aeiou]+$/i,
  LETTER_ONLY: /^[a-z]$/i,

  // Repetition patterns
  DOUBLE_LETTERS: /(.)\1/,
  TRIPLE_LETTERS: /(.)\1{2,}/,

  // Word structure
  STARTS_WITH_VOWEL: /^[aeiou]/i,
  ENDS_WITH_VOWEL: /[aeiou]$/i,
} as const;

export type TextPattern = keyof typeof TEXT_PATTERNS;

/**
 * Test a word against a specific pattern
 */
export const matchesPattern = (word: string, pattern: TextPattern): boolean => {
  return TEXT_PATTERNS[pattern].test(word);
};
