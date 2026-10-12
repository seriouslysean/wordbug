/**
 * URL path constants for consistent routing across the application.
 * Used by URL helpers, page metadata, and tests to ensure consistency.
 *
 * These name routes, without a trailing slash ('/stats'): page metadata,
 * the patterns below and social card file names are keyed by them. The URL a
 * page is served at ends in a slash ('/stats/'), and getUrl() is what turns
 * the one into the other.
 */

import { slugify } from '#utils/text-utils';

// =====================================================
// Base Paths - Top-level sections
// =====================================================

export const BASE_PATHS = {
  HOME: '/',
  WORD: '/word',
  BROWSE: '/browse',
  STATS: '/stats',
  ABOUT: '/about',
  ATTRIBUTIONS: '/attributions',
  NOT_FOUND: '/404',
} as const;

// =====================================================
// Word Browsing Paths - Category pages
// =====================================================

export const BROWSE_PATHS = {
  BROWSE: '/browse',
  LENGTH: '/browse/length',
  LETTER: '/browse/letter',
  PART_OF_SPEECH: '/browse/part-of-speech',
} as const;

// =====================================================
// URL Patterns - For dynamic route matching
// =====================================================

export const URL_PATTERNS = {
  WORD_DETAIL: /^\/word\/([^/]+)$/,
  YEAR_PAGE: /^\/browse\/(\d{4})$/,
  MONTH_PAGE: /^\/browse\/(\d{4})\/([a-z]+)$/,
  LENGTH_PAGE: /^\/browse\/length\/(\d+)$/,
  LETTER_PAGE: /^\/browse\/letter\/([a-z])$/,
  PART_OF_SPEECH_PAGE: /^\/browse\/part-of-speech\/([a-z]+)$/,
  STATS_PAGE: /^\/stats\/([a-z-]+)$/,
} as const;

// =====================================================
// File Paths - URLs that name a file, not a page
// =====================================================

// A path whose last segment ends in an extension: '/rss.xml',
// '/images/social/pages/stats.png'. Astro's dev server draws the same line
// under `trailingSlash: 'always'` (hasFileExtension in
// @astrojs/internal-helpers/path; its pattern also wants the slash before
// the segment, which a path given here without one lacks). slugify() drops
// dots, so no page route built below matches.
export const FILE_PATH_PATTERN = /[^/]\.\w+$/;

// =====================================================
// Route Builders - Template functions
// =====================================================

export const ROUTES = {
  WORD: (word: string) => `${BASE_PATHS.WORD}/${slugify(word)}`,
  YEAR: (year: string) => `${BASE_PATHS.BROWSE}/${year}`,
  MONTH: (year: string, month: string) => `${BASE_PATHS.BROWSE}/${year}/${slugify(month)}`,
  LENGTH: (length: number) => `${BROWSE_PATHS.LENGTH}/${length}`,
  LETTER: (letter: string) => `${BROWSE_PATHS.LETTER}/${slugify(letter)}`,
  PART_OF_SPEECH: (partOfSpeech: string) => `${BROWSE_PATHS.PART_OF_SPEECH}/${slugify(partOfSpeech)}`,
  STAT: (stat: string) => `${BASE_PATHS.STATS}/${slugify(stat)}`,
} as const;

// Re-export STATS_SLUGS from the single source of truth
export { STATS_SLUGS } from '#constants/stats';

// =====================================================
// Type exports for TypeScript safety
// =====================================================

export type BasePath = typeof BASE_PATHS[keyof typeof BASE_PATHS];
export type BrowsePath = typeof BROWSE_PATHS[keyof typeof BROWSE_PATHS];
export type URLPattern = typeof URL_PATTERNS[keyof typeof URL_PATTERNS];