import { logSentryError } from './sentry-client.js';

/**
 * Constructs a URL with the base URL if configured
 * Consistently enforces lowercase URLs and no trailing slashes except for root path
 * Note: Static sites can't handle case-insensitive URLs without server configuration
 * @param {string} path - Path to append to base URL
 * @returns {string} - Complete URL
 * @throws {Error} - If path format is invalid
 */
export const getUrl = (path = '/') => {
  // Get base URL from environment or default to '/'
  const baseUrl = import.meta.env.BASE_URL || '/';

  // Handle special case for root path
  if (path === '/') {
    return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  }

  // Validate path for double slashes
  if (/\/\/+/.test(path)) {
    logSentryError('InvalidPath', { path });
    throw new Error('Invalid path: contains multiple consecutive slashes');
  }

  // Normalize values
  const normalizedPath = path.toLowerCase().startsWith('/') ? path.toLowerCase() : `/${path.toLowerCase()}`;
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  // Handle file paths (with extensions)
  if (normalizedPath.includes('.')) {
    return `${normalizedBase}${normalizedPath}`;
  }

  // For content pages: no trailing slash
  return `${normalizedBase}${normalizedPath.replace(/\/$/, '')}`;
};

/**
 * Format word count with singular/plural handling
 * @param {number} count - Number of words
 * @returns {string} - Formatted string (e.g., "1 word" or "5 words")
 */
export const formatWordCount = (count) => {
  return `${count} ${count === 1 ? 'word' : 'words'}`;
};

/**
 * Gets a normalized full URL including site URL and path
 * For use in canonicals, social tags, and other absolute URL needs
 * @param {string} path - Path to append to site URL
 * @returns {string} - Complete absolute URL
 */
export const getFullUrl = (path = '/') => {
  // Normalize site URL (no trailing slash)
  const siteUrl = import.meta.env.SITE_URL?.endsWith('/')
    ? import.meta.env.SITE_URL.slice(0, -1)
    : import.meta.env.SITE_URL;

  // Handle root path special case
  if (path === '/') {
    return `${siteUrl}/`;
  }

  // Normalize path (lowercase with leading slash)
  const normalizedPath = path.toLowerCase().startsWith('/')
    ? path.toLowerCase()
    : `/${path.toLowerCase()}`;

  // For files with extensions, preserve as-is
  if (normalizedPath.includes('.')) {
    return `${siteUrl}${normalizedPath}`;
  }

  // For content pages: no trailing slash
  return `${siteUrl}${normalizedPath.replace(/\/$/, '')}`;
};

/**
 * Creates a consistent, SEO-friendly internal link URL
 * @param {string} word - The word to link to
 * @returns {string} - SEO-friendly URL for the word
 */
export const getWordUrl = (word) =>
  word ? getUrl(`/${word.toLowerCase()}`) : '';

/**
 * Creates a consistent, SEO-friendly date-based link URL
 * @param {string} date - The date in YYYYMMDD format
 * @returns {string} - SEO-friendly URL for the date
 */
export const getDateUrl = (date) =>
  date ? getUrl(`/${date}`) : '';
