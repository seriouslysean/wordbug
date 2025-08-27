/**
 * URL path constants for consistent routing across the application.
 * Used by URL helpers, page metadata, and tests to ensure consistency.
 */

// =====================================================
// Base Paths - Top-level sections
// =====================================================

export const BASE_PATHS = {
  HOME: '/',
  WORDS: '/words',
  STATS: '/stats',
  ABOUT: '/about',
} as const;

// =====================================================
// Word Browsing Paths - Category pages
// =====================================================

export const BROWSE_PATHS = {
  WORDS_LENGTH: '/words/length',
  WORDS_LETTER: '/words/letter',
  WORDS_PART_OF_SPEECH: '/words/part-of-speech',
} as const;

// =====================================================
// URL Patterns - For dynamic route matching
// =====================================================

export const URL_PATTERNS = {
  WORD_DETAIL: /^\/words\/([^/]+)$/,
  YEAR_PAGE: /^\/words\/(\d{4})$/,
  MONTH_PAGE: /^\/words\/(\d{4})\/([a-z]+)$/,
  LENGTH_PAGE: /^\/words\/length\/(\d+)$/,
  LETTER_PAGE: /^\/words\/letter\/([a-z])$/,
  PART_OF_SPEECH_PAGE: /^\/words\/part-of-speech\/([a-z]+)$/,
  STATS_PAGE: /^\/stats\/([a-z-]+)$/,
} as const;

// =====================================================
// Route Builders - Template functions
// =====================================================

export const ROUTES = {
  WORD: (word: string) => `/words/${word}`,
  YEAR: (year: string) => `/words/${year}`,
  MONTH: (year: string, month: string) => `/words/${year}/${month.toLowerCase()}`,
  LENGTH: (length: number) => `/words/length/${length}`,
  LETTER: (letter: string) => `/words/letter/${letter.toLowerCase()}`,
  PART_OF_SPEECH: (partOfSpeech: string) => `/words/part-of-speech/${partOfSpeech.toLowerCase()}`,
  STAT: (stat: string) => `/stats/${stat}`,
} as const;

// =====================================================
// Stats Page Slugs - Single source of truth
// =====================================================

export const STATS_SLUGS = {
  // Letter patterns
  SAME_START_END: 'same-start-end',
  DOUBLE_LETTERS: 'double-letters', 
  TRIPLE_LETTERS: 'triple-letters',
  ALPHABETICAL_ORDER: 'alphabetical-order',
  PALINDROMES: 'palindromes',
  
  // Word endings
  WORDS_ENDING_ING: 'words-ending-ing',
  WORDS_ENDING_ED: 'words-ending-ed',
  WORDS_ENDING_LY: 'words-ending-ly',
  WORDS_ENDING_NESS: 'words-ending-ness',
  WORDS_ENDING_FUL: 'words-ending-ful',
  WORDS_ENDING_LESS: 'words-ending-less',
  
  // Stats sections
  WORD_FACTS: 'word-facts',
  STREAKS: 'streaks', 
  LETTER_PATTERNS: 'letter-patterns',
  WORD_ENDINGS: 'word-endings',
  
  // Other stats
  MILESTONE_WORDS: 'milestone-words',
  CURRENT_STREAK: 'current-streak',
  LONGEST_STREAK: 'longest-streak',
  MOST_COMMON_LETTER: 'most-common-letter',
  LEAST_COMMON_LETTER: 'least-common-letter',
  ALL_CONSONANTS: 'all-consonants',
  ALL_VOWELS: 'all-vowels',
} as const;

// =====================================================
// Type exports for TypeScript safety
// =====================================================

export type BasePath = typeof BASE_PATHS[keyof typeof BASE_PATHS];
export type BrowsePath = typeof BROWSE_PATHS[keyof typeof BROWSE_PATHS];
export type URLPattern = typeof URL_PATTERNS[keyof typeof URL_PATTERNS];