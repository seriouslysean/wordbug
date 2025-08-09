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

