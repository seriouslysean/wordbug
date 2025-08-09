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
} as const;

// =====================================================
// URL Patterns - For dynamic route matching
// =====================================================

export const URL_PATTERNS = {
  WORD_DETAIL: /^words\/[^/]+$/,
  YEAR_PAGE: /^words\/(\d{4})$/,
  MONTH_PAGE: /^words\/\d{4}\/[a-z]+$/,
  LENGTH_PAGE: /^words\/length\/(\d+)$/,
  LETTER_PAGE: /^words\/letter\/([a-z])$/,
  STATS_PAGE: /^stats\/[a-z-]+$/,
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
  STAT: (stat: string) => `/stats/${stat}`,
} as const;

// =====================================================
// Type exports for TypeScript safety
// =====================================================

export type BasePath = typeof BASE_PATHS[keyof typeof BASE_PATHS];
export type BrowsePath = typeof BROWSE_PATHS[keyof typeof BROWSE_PATHS];
export type URLPattern = typeof URL_PATTERNS[keyof typeof URL_PATTERNS];