import { logger } from '~utils/logger';

/**
 * Constructs a URL with the base URL if configured
 * Consistently enforces lowercase URLs and no trailing slashes except for root path
 */
export const getUrl = (path = '/'): string => {
  const baseUrl = import.meta.env.BASE_URL || '/';

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

  const normalizedPath = path.toLowerCase().startsWith('/') ? path.toLowerCase() : `/${path.toLowerCase()}`;
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  if (normalizedPath.includes('.')) {
    return `${normalizedBase}${normalizedPath}`;
  }

  return `${normalizedBase}${normalizedPath.replace(/\/$/, '')}`;
};

/**
 * Gets a normalized full URL including site URL and path
 * For use in canonicals, social tags, and other absolute URL needs
 */
export const getFullUrl = (path = '/'): string => {
  const siteUrl = import.meta.env.SITE_URL?.endsWith('/')
    ? import.meta.env.SITE_URL.slice(0, -1)
    : import.meta.env.SITE_URL;

  if (path === '/') {
    return `${siteUrl}/`;
  }

  const normalizedPath = path.toLowerCase().startsWith('/')
    ? path.toLowerCase()
    : `/${path.toLowerCase()}`;

  if (normalizedPath.includes('.')) {
    return `${siteUrl}${normalizedPath}`;
  }

  return `${siteUrl}${normalizedPath.replace(/\/$/, '')}`;
};

/**
 * Creates a consistent, SEO-friendly internal link URL
 */
export const getWordUrl = (word: string): string => {
  return word ? getUrl(`/${word.toLowerCase()}`) : '';
};

/**
 * Creates a consistent, SEO-friendly date-based link URL
 */
export const getDateUrl = (date: string): string => {
  return date ? getUrl(`/${date}`) : '';
};