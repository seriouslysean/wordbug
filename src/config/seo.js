/**
 * @fileoverview SEO configuration and utilities
 * Centralized SEO config following Astro best practices
 */

// SEO configuration using environment variables with sensible fallbacks
export const seoConfig = {
  defaultTitle: import.meta.env.SITE_TITLE || 'Bug\'s (Occasional) Word of the Day',
  defaultDescription: import.meta.env.SITE_DESCRIPTION || 'Educational vocabulary site featuring words my son thinks are cool. Daily word definitions from Wordnik with pronunciation, etymology, and cross-references.',
  siteName: import.meta.env.SITE_NAME || 'WordBug',
  locale: import.meta.env.SITE_LOCALE || 'en-US',
  canonicalBase: import.meta.env.SITE_URL || import.meta.env.BASE_URL || 'http://localhost:4321',
  author: import.meta.env.SITE_AUTHOR || 'Sean Kennedy & Jacob Kennedy',
  keywords: (import.meta.env.SITE_KEYWORDS || 'educational,vocabulary,word of the day,education,learning,dictionary,definitions,students,language arts,reading comprehension,homeschool,classroom,study,academic').split(','),
};

/**
 * Generate canonical URL for a page
 * @param {string} pathname - Page pathname
 * @returns {string} Full canonical URL
 */
export function getCanonicalUrl(pathname) {
  const cleanPath = pathname.replace(/\/$/, '') || '';
  const baseUrl = seoConfig.canonicalBase.endsWith('/')
    ? seoConfig.canonicalBase.slice(0, -1)
    : seoConfig.canonicalBase;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Generate page-specific meta description
 * @param {Object} options - Page options
 * @param {string} options.word - Word for word pages
 * @param {string} options.definition - Word definition
 * @param {string} options.custom - Custom description
 * @returns {string} Meta description
 */
export function getMetaDescription({ word, definition, custom } = {}) {
  if (custom) {return custom;}

  if (word && definition) {
    // Truncate definition to ~150 chars for meta description (2025 best practice)
    const shortDef = definition.length > 100
      ? definition.substring(0, 100).trim() + '...'
      : definition;
    return `${word}: ${shortDef} | ${seoConfig.siteName}`;
  }

  return seoConfig.defaultDescription;
}

