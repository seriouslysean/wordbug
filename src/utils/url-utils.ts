import { logger } from '~astro-utils/logger';

/**
 * Construct a URL with the configured base path
 * Consistently enforces lowercase URLs and no trailing slashes except for root path
 * @param path - Path to normalize
 * @returns Normalized URL path
 */
export const getUrl = (path = '/'): string => {
  const baseUrl = import.meta.env.BASE_PATH || '/';

  if (!path || path === '') {
    return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  }

  if (path === '/') {
    return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  }

  if (/\/\/+/.test(path)) {
    logger.error('Invalid path contains multiple consecutive slashes', { path });
    throw new Error('Invalid path: contains multiple consecutive slashes');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  if (normalizedPath.includes('.')) {
    return `${normalizedBase}${normalizedPath}`;
  }

  return `${normalizedBase}${normalizedPath.replace(/\/$/, '')}`;
};

/**
 * Get a normalized full URL including site URL and path
 * Uses getUrl() internally to ensure BASE_PATH is properly handled
 * @param path - Path to append to site URL
 * @returns Absolute URL
 */
export const getFullUrl = (path = '/'): string => {
  const siteUrl = import.meta.env.SITE_URL?.replace(/\/$/, '') || '';
  const relativePath = getUrl(path);

  if (!siteUrl) {
    logger.error('SITE_URL environment variable is required for getFullUrl');
    throw new Error('SITE_URL environment variable is required');
  }

  return `${siteUrl}${relativePath}`;
};

/**
 * Create a consistent, SEO-friendly internal link path for a word
 * @param {string} word - Word to build path for
 * @returns {string} Relative word path (without BASE_PATH)
 */
export const getWordUrl = (word: string): string => {
  return word ? `/words/${word}` : '';
};

/**
 * Remove BASE_PATH prefix from an incoming pathname
 * Handles case differences and trailing slashes
 * @param pathname - Raw pathname that may include the base path
 * @returns Pathname relative to the site root
 */
export const stripBasePath = (pathname: string): string => {
  const base = (import.meta.env.BASE_PATH || '').replace(/\/+$/, '');
  const hasBase = base && pathname.toLowerCase().startsWith(base.toLowerCase());
  const withoutBase = hasBase ? pathname.slice(base.length) : pathname;
  const clean = withoutBase.replace(/^\/+|\/+$/g, '');
  return clean || 'home';
};

import { BASE_PATHS, BROWSE_PATHS, ROUTES } from '~constants/urls';

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
 * @param {number} length - Word length
 * @returns {string} Length-filtered words URL
 */
export const getLengthUrl = (length: number): string => 
  ROUTES.LENGTH(length);

/**
 * Get URL for words starting with a specific letter
 * @param {string} letter - Starting letter (normalized to lowercase)
 * @returns {string} Letter-filtered words URL
 */
export const getLetterUrl = (letter: string): string => 
  ROUTES.LETTER(letter);

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

