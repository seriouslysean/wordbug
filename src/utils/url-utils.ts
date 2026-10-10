import { BASE_PATH, SITE_URL } from 'astro:env/client';
import { BASE_PATHS, BROWSE_PATHS, ROUTES, STATS_SLUGS } from '#constants/urls';
import { isPathUnderBase, withoutTrailingSlash, withTrailingSlash } from '#utils/url-utils';

// =====================================================
// URL Slug Utilities
// =====================================================

// Re-export slugify from shared utils (single source of truth)
export { slugify } from '#utils/text-utils';

/**
 * Get the configured base path, defaulting to '/'
 * Single source of truth for base path access
 * @returns Base path with format determined by Astro's trailingSlash config
 */
export const getBasePath = (): string => {
  return BASE_PATH || '/';
};

/**
 * Get the route a pathname stands for: no base path, no trailing slash
 * Use this with Astro.url.pathname, which is '/blog/stats/' for the route
 * '/stats' (`build.format: 'directory'` with `trailingSlash: 'always'`)
 * @param astroPathname - The pathname from Astro.url.pathname
 * @returns Route path without base path; the root is '/'
 */
export const getPathname = (astroPathname: string): string => {
  const basePath = getBasePath();

  if (basePath === '/') {
    return withoutTrailingSlash(astroPathname);
  }

  // Handle base path with trailing slash
  const cleanBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;

  if (isPathUnderBase(astroPathname, cleanBasePath)) {
    const withoutBase = astroPathname.slice(cleanBasePath.length);
    return withoutTrailingSlash(withoutBase || '/');
  }

  return withoutTrailingSlash(astroPathname);
};

/**
 * Construct the URL a page or file is served at, with the configured base path
 * @param path - Route or file path to append to base path, or a pathname
 * that already carries it (Astro.url.pathname). A path only: a query string
 * or fragment would be read as part of the last segment
 * @returns URL path with base path: a page ends in a slash ('/blog/stats/'),
 * a file does not ('/blog/rss.xml'), and the site root is '/blog/'
 */
export const getUrl = (path = '/'): string => {
  const basePath = getBasePath();

  if (basePath === '/') {
    return withTrailingSlash(path);
  }

  // Normalize base path (remove trailing slash)
  const cleanBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;

  // The base path itself is the site root: a directory, even when its name
  // has a dot in it ('/my.site')
  if (path === cleanBasePath) {
    return `${cleanBasePath}/`;
  }

  // Check if path already includes base path
  if (isPathUnderBase(path, cleanBasePath)) {
    return withTrailingSlash(path);
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return withTrailingSlash(cleanBasePath + normalizedPath);
};

/**
 * Get a normalized full URL including site URL and path
 * Uses the URL constructor for robust URL handling
 * @param path - Path to append to site URL (with or without BASE_PATH)
 * @returns Absolute URL
 */
export const getFullUrl = (path = '/'): string => {
  if (!SITE_URL) {
    throw new Error('SITE_URL environment variable is required but missing');
  }

  try {
    const relativePath = getUrl(path);
    const url = new URL(relativePath, SITE_URL);
    return url.toString();
  } catch (error) {
    throw new Error(`Failed to construct URL for path: ${path}`, { cause: error });
  }
};

/**
 * Create a consistent, SEO-friendly internal link path for a word
 * @param word - Word to build path for
 * @returns Relative word path (without BASE_PATH)
 */
export const getWordUrl = (word: string): string => {
  return word ? ROUTES.WORD(word) : '';
};

/**
 * Remove BASE_PATH prefix and trailing slash from an incoming pathname
 * @param pathname - Raw pathname that may include the base path
 * @returns Route path relative to the site root (web standard with leading slash)
 */
export const stripBasePath = (pathname: string): string => {
  const cleanPath = getPathname(pathname);
  // Return web standard paths with leading slashes
  if (cleanPath === '/') {
    return '/';
  }
  return cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
};

// =====================================================
// Section URLs - Top-level navigation
// =====================================================

/**
 * Get the words section homepage URL
 * @returns Words section URL
 */
export const getWordsUrl = (): string => BASE_PATHS.WORD;

/**
 * Get the stats section homepage URL
 * @returns Stats section URL
 */
export const getStatsUrl = (): string => BASE_PATHS.STATS;

// =====================================================
// Word Browsing URLs - Category pages
// =====================================================

/**
 * Get the words by length overview URL
 * @returns Words by length URL
 */
export const getWordsLengthUrl = (): string => BROWSE_PATHS.LENGTH;

/**
 * Get the words by letter overview URL
 * @returns Words by letter URL
 */
export const getWordsLetterUrl = (): string => BROWSE_PATHS.LETTER;

/**
 * Get the words by part of speech overview URL
 * @returns Words by part of speech URL
 */
export const getWordsPartOfSpeechUrl = (): string => BROWSE_PATHS.PART_OF_SPEECH;

/**
 * Get the words by year overview URL
 * @returns Words by year URL
 */
export const getWordsYearIndexUrl = (): string => `${BROWSE_PATHS.BROWSE}/year`;

/**
 * Get the browse words URL
 * @returns Browse words URL
 */
export const getBrowseWordsUrl = (): string => BASE_PATHS.BROWSE;

/**
 * Get a year URL or browse root if no year specified
 * @param [year] - Optional year to navigate to
 * @returns Year URL or browse root
 */
export const getWordsYearUrl = (year?: string): string =>
  year ? ROUTES.YEAR(year) : BASE_PATHS.BROWSE;

// =====================================================
// Specific Browsing URLs - Filtered lists
// =====================================================

// Re-export filtering URL helpers from shared utils (single source of truth)
export { getLengthUrl, getLetterUrl, getPartOfSpeechUrl } from '#utils/url-utils';

/**
 * Get URL for words from a specific month/year
 * @param year - Year 
 * @param month - Month slug (normalized to lowercase)
 * @returns Month-filtered words URL
 */
export const getMonthUrl = (year: string, month: string): string => 
  ROUTES.MONTH(year, month);

// =====================================================
// Stats URLs - Statistics and data pages
// =====================================================

/**
 * Get URL for a specific stats page
 * @param stat - Stats page slug
 * @returns Stats page URL
 */
export const getStatUrl = (stat: string): string => 
  ROUTES.STAT(stat);

// =====================================================
// Specific Stats URLs - Letter Patterns
// =====================================================

/**
 * Get URL for same start/end letter stats page
 * @returns Same start/end stats URL
 */
export const getSameStartEndUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.SAME_START_END);

/**
 * Get URL for double letters stats page
 * @returns Double letters stats URL
 */
export const getDoubleLettersUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.DOUBLE_LETTERS);

/**
 * Get URL for triple letters stats page
 * @returns Triple letters stats URL
 */
export const getTripleLettersUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.TRIPLE_LETTERS);

/**
 * Get URL for alphabetical order stats page
 * @returns Alphabetical order stats URL
 */
export const getAlphabeticalOrderUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.ALPHABETICAL_ORDER);

/**
 * Get URL for palindromes stats page
 * @returns Palindromes stats URL
 */
export const getPalindromesUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.PALINDROMES);

// =====================================================
// Specific Stats URLs - Word Endings
// =====================================================

/**
 * Get URL for words ending in "ing" stats page
 * @returns Words ending in "ing" stats URL
 */
export const getWordsEndingIngUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_ING);

/**
 * Get URL for words ending in "ed" stats page
 * @returns Words ending in "ed" stats URL
 */
export const getWordsEndingEdUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_ED);

/**
 * Get URL for words ending in "ly" stats page
 * @returns Words ending in "ly" stats URL
 */
export const getWordsEndingLyUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_LY);

/**
 * Get URL for words ending in "ness" stats page
 * @returns Words ending in "ness" stats URL
 */
export const getWordsEndingNessUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_NESS);

/**
 * Get URL for words ending in "ful" stats page
 * @returns Words ending in "ful" stats URL
 */
export const getWordsEndingFulUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_FUL);

/**
 * Get URL for words ending in "less" stats page
 * @returns Words ending in "less" stats URL
 */
export const getWordsEndingLessUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.WORDS_ENDING_LESS);

// =====================================================
// Specific Stats URLs - Stats Sections
// =====================================================

/**
 * Get URL for word facts stats section
 * @returns Word facts stats URL
 */
export const getWordFactsUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.WORD_FACTS);

/**
 * Get URL for streaks stats section
 * @returns Streaks stats URL
 */
export const getStreaksUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.STREAKS);

/**
 * Get URL for letter patterns stats section
 * @returns Letter patterns stats URL
 */
export const getLetterPatternsUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.LETTER_PATTERNS);

/**
 * Get URL for word endings stats section
 * @returns Word endings stats URL
 */
export const getWordEndingsUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.WORD_ENDINGS);

/**
 * Get URL for parts of speech stats section. The words of one part of speech
 * are a browse page: see getPartOfSpeechUrl.
 * @returns Parts of speech stats URL
 */
export const getPartsOfSpeechStatsUrl = (): string =>
  ROUTES.STAT(STATS_SLUGS.PARTS_OF_SPEECH);

// =====================================================
// Specific Stats URLs - Other Stats
// =====================================================

/**
 * Get URL for milestone words stats page
 * @returns Milestone words stats URL
 */
export const getMilestoneWordsUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.MILESTONE_WORDS);

/**
 * Get URL for current streak stats page
 * @returns Current streak stats URL
 */
export const getCurrentStreakUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.CURRENT_STREAK);

/**
 * Get URL for longest streak stats page
 * @returns Longest streak stats URL
 */
export const getLongestStreakUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.LONGEST_STREAK);

/**
 * Get URL for most common letter stats page
 * @returns Most common letter stats URL
 */
export const getMostCommonLetterUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.MOST_COMMON_LETTER);

/**
 * Get URL for least common letter stats page
 * @returns Least common letter stats URL
 */
export const getLeastCommonLetterUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.LEAST_COMMON_LETTER);

/**
 * Get URL for all consonants stats page
 * @returns All consonants stats URL
 */
export const getAllConsonantsUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.ALL_CONSONANTS);

/**
 * Get URL for all vowels stats page
 * @returns All vowels stats URL
 */
export const getAllVowelsUrl = (): string => 
  ROUTES.STAT(STATS_SLUGS.ALL_VOWELS);

