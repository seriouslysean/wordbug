import { logger } from '~utils-client/logger';

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

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  if (normalizedPath.includes('.')) {
    return `${normalizedBase}${normalizedPath}`;
  }

  return `${normalizedBase}${normalizedPath.replace(/\/$/, '')}`;
};

/**
 * Gets a normalized full URL including site URL and path
 * For use in canonicals, social tags, and other absolute URL needs
 * Uses getUrl() internally to ensure BASE_URL is properly handled
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
 * Creates a consistent, SEO-friendly internal link URL
 */
export const getWordUrl = (word: string): string => {
  return word ? getUrl(`/words/${word}`) : '';
};

