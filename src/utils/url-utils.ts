import { logger } from '~astro-utils/logger';

// =====================================================
// URL Slug Utilities
// =====================================================

/**
 * Convert any string to a URL-safe slug
 */
export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Get the configured base path, defaulting to '/'
 * Single source of truth for base path access
 * Uses Astro's calculated BASE_URL which respects trailingSlash configuration
 * @returns Base path with format determined by Astro's trailingSlash config
 */
export const getBasePath = (): string => {
  return __BASE_URL__ || '/';
};

/**
 * Get a clean pathname without the base path
 * Use this with Astro.url.pathname to get the logical path
 * @param astroPathname - The pathname from Astro.url.pathname
 * @returns Clean pathname without base path
 */
export const getPathname = (astroPathname: string): string => {
  const basePath = getBasePath();
  
  if (basePath === '/') {
    return astroPathname;
  }
  
  // Handle base path with trailing slash
  const cleanBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  
  if (astroPathname.startsWith(cleanBasePath)) {
    const withoutBase = astroPathname.slice(cleanBasePath.length);
    return withoutBase || '/';
  }
  
  return astroPathname;
};

/**
 * Construct a URL with the configured base path
 * Simple function that trusts Astro and URL constructor for normalization
 * @param path - Path to append to base path
 * @returns URL path with base path
 */
export const getUrl = (path = '/'): string => {
  const basePath = getBasePath();
  
  if (basePath === '/') {
    return path;
  }
  
  if (path === '/') {
    return basePath; // Return base path as-is for root
  }
  
  // Check if path already includes base path
  if (path.startsWith(basePath)) {
    return path;
  }
  
  // Normalize base path (remove trailing slash) and concatenate  
  const cleanBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return cleanBasePath + normalizedPath;
};

/**
 * Get a normalized full URL including site URL and path
 * Uses the URL constructor for robust URL handling
 * @param path - Path to append to site URL (with or without BASE_PATH)
 * @returns Absolute URL
 */
export const getFullUrl = (path = '/'): string => {
  if (!__SITE_URL__) {
    throw new Error('SITE_URL environment variable is required but missing');
  }
  
  try {
    const relativePath = getUrl(path);
    const url = new URL(relativePath, __SITE_URL__);
    return url.toString();
  } catch (error) {
    logger.error('Failed to construct URL', { path, siteUrl: __SITE_URL__, error });
    throw new Error(`Failed to construct URL for path: ${path}`);
  }
};

/**
 * Create a consistent, SEO-friendly internal link path for a word
 * @param {string} word - Word to build path for
 * @returns {string} Relative word path (without BASE_PATH)
 */
export const getWordUrl = (word: string): string => {
  return word ? ROUTES.WORD(word) : '';
};

/**
 * Remove BASE_PATH prefix from an incoming pathname
 * @param pathname - Raw pathname that may include the base path
 * @returns Pathname relative to the site root (web standard with leading slash)
 */
export const stripBasePath = (pathname: string): string => {
  const cleanPath = getPathname(pathname);
  // Return web standard paths with leading slashes
  if (cleanPath === '/') return '/';
  return cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
};

import { BASE_PATHS, BROWSE_PATHS, ROUTES, STATS_SLUGS } from '~constants/urls';

// =====================================================
// Section URLs - Top-level navigation
// =====================================================

/**
 * Get the words section homepage URL
 * @returns {string} Words section URL
 */
export const getWordsUrl = (): string => BASE_PATHS.WORDS;

/**
 * Get the stats section homepage URL  
 * @returns {string} Stats section URL
 */
export const getStatsUrl = (): string => BASE_PATHS.STATS;

// =====================================================
// Word Browsing URLs - Category pages
// =====================================================

/**
 * Get the words by length overview URL
 * @returns {string} Words by length URL
 */
export const getWordsLengthUrl = (): string => BROWSE_PATHS.WORDS_LENGTH;

/**
 * Get the words by letter overview URL
 * @returns {string} Words by letter URL
 */
export const getWordsLetterUrl = (): string => BROWSE_PATHS.WORDS_LETTER;

/**
 * Get the words by part of speech overview URL
 * @returns {string} Words by part of speech URL
 */
export const getWordsPartOfSpeechUrl = (): string => BROWSE_PATHS.WORDS_PART_OF_SPEECH;

/**
 * Get the browse words URL
 * @returns {string} Browse words URL
 */
export const getBrowseWordsUrl = (): string => `${BASE_PATHS.WORDS}/browse`;

/**
 * Get a year URL or words root if no year specified
 * @param {string} [year] - Optional year to navigate to
 * @returns {string} Year URL or words root
 */
export const getWordsYearUrl = (year?: string): string => 
  year ? ROUTES.YEAR(year) : BASE_PATHS.WORDS;

// =====================================================
// Specific Browsing URLs - Filtered lists
// =====================================================

/**
 * Get URL for words of a specific length
 * @param {number | string} length - Word length
 * @returns {string} Length-filtered words URL
 */
export const getLengthUrl = (length: number | string): string => 
  ROUTES.LENGTH(Number(length));

/**
 * Get URL for words starting with a specific letter
 * @param {string} letter - Starting letter (normalized to lowercase)
 * @returns {string} Letter-filtered words URL
 */
export const getLetterUrl = (letter: string): string => 
  ROUTES.LETTER(letter);

/**
 * Get URL for words with a specific part of speech
 * @param {string} partOfSpeech - Part of speech (normalized to lowercase)
 * @returns {string} Part-of-speech-filtered words URL
 */
export const getPartOfSpeechUrl = (partOfSpeech: string): string => 
  ROUTES.PART_OF_SPEECH(partOfSpeech);

/**
 * Get URL for words from a specific month/year
 * @param {string} year - Year 
 * @param {string} month - Month slug (normalized to lowercase)
 * @returns {string} Month-filtered words URL
 */
export const getMonthUrl = (year: string, month: string): string => 
  ROUTES.MONTH(year, month);

// =====================================================
// Stats URLs - Statistics and data pages
// =====================================================

/**
 * Get URL for a specific stats page
 * @param {string} stat - Stats page slug
 * @returns {string} Stats page URL
 */
export const getStatUrl = (stat: string): string => 
  ROUTES.STAT(stat);

// =====================================================
// Specific Stats URLs - Letter Patterns
// =====================================================

/**
 * Get URL for same start/end letter stats page
 * @returns {string} Same start/end stats URL
 */
export const getSameStartEndUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.SAME_START_END);

/**
 * Get URL for double letters stats page
 * @returns {string} Double letters stats URL
 */
export const getDoubleLettersUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.DOUBLE_LETTERS);

/**
 * Get URL for triple letters stats page
 * @returns {string} Triple letters stats URL
 */
export const getTripleLettersUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.TRIPLE_LETTERS);

/**
 * Get URL for alphabetical order stats page
 * @returns {string} Alphabetical order stats URL
 */
export const getAlphabeticalOrderUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.ALPHABETICAL_ORDER);

/**
 * Get URL for palindromes stats page
 * @returns {string} Palindromes stats URL
 */
export const getPalindromesUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.PALINDROMES);

// =====================================================
// Specific Stats URLs - Word Endings
// =====================================================

/**
 * Get URL for words ending in "ing" stats page
 * @returns {string} Words ending in "ing" stats URL
 */
export const getWordsEndingIngUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_ING);

/**
 * Get URL for words ending in "ed" stats page
 * @returns {string} Words ending in "ed" stats URL
 */
export const getWordsEndingEdUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_ED);

/**
 * Get URL for words ending in "ly" stats page
 * @returns {string} Words ending in "ly" stats URL
 */
export const getWordsEndingLyUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_LY);

/**
 * Get URL for words ending in "ness" stats page
 * @returns {string} Words ending in "ness" stats URL
 */
export const getWordsEndingNessUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_NESS);

/**
 * Get URL for words ending in "ful" stats page
 * @returns {string} Words ending in "ful" stats URL
 */
export const getWordsEndingFulUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_FUL);

/**
 * Get URL for words ending in "less" stats page
 * @returns {string} Words ending in "less" stats URL
 */
export const getWordsEndingLessUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_LESS);

// =====================================================
// Specific Stats URLs - Stats Sections
// =====================================================

/**
 * Get URL for word facts stats section
 * @returns {string} Word facts stats URL
 */
export const getWordFactsUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.WORD_FACTS);

/**
 * Get URL for streaks stats section
 * @returns {string} Streaks stats URL
 */
export const getStreaksUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.STREAKS);

/**
 * Get URL for letter patterns stats section
 * @returns {string} Letter patterns stats URL
 */
export const getLetterPatternsUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.LETTER_PATTERNS);

/**
 * Get URL for word endings stats section
 * @returns {string} Word endings stats URL
 */
export const getWordEndingsUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.WORD_ENDINGS);

// =====================================================
// Specific Stats URLs - Other Stats
// =====================================================

/**
 * Get URL for milestone words stats page
 * @returns {string} Milestone words stats URL
 */
export const getMilestoneWordsUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.MILESTONE_WORDS);

/**
 * Get URL for current streak stats page
 * @returns {string} Current streak stats URL
 */
export const getCurrentStreakUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.CURRENT_STREAK);

/**
 * Get URL for longest streak stats page
 * @returns {string} Longest streak stats URL
 */
export const getLongestStreakUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.LONGEST_STREAK);

/**
 * Get URL for most common letter stats page
 * @returns {string} Most common letter stats URL
 */
export const getMostCommonLetterUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.MOST_COMMON_LETTER);

/**
 * Get URL for least common letter stats page
 * @returns {string} Least common letter stats URL
 */
export const getLeastCommonLetterUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.LEAST_COMMON_LETTER);

/**
 * Get URL for all consonants stats page
 * @returns {string} All consonants stats URL
 */
export const getAllConsonantsUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.ALL_CONSONANTS);

/**
 * Get URL for all vowels stats page
 * @returns {string} All vowels stats URL
 */
export const getAllVowelsUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.ALL_VOWELS);

