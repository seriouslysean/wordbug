import { logger } from '~astro-utils/logger';

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
  return word ? `/words/${word}` : '';
};

/**
 * Remove BASE_PATH prefix from an incoming pathname
 * @param pathname - Raw pathname that may include the base path
 * @returns Pathname relative to the site root (without base path or slashes), empty string for root
 */
export const stripBasePath = (pathname: string): string => {
  const cleanPath = getPathname(pathname);
  // Remove leading and trailing slashes for page metadata lookup
  if (cleanPath === '/') return '';
  return cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;
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

