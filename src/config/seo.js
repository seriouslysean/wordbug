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
  keywords: (import.meta.env.SITE_KEYWORDS || 'vocabulary,word of the day,education,learning,dictionary,definitions').split(','),
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

/**
 * Generate JSON-LD structured data for word definitions
 * Following Schema.org 2025 vocabulary standards
 * @param {Object} wordData - Word data object
 * @returns {Object} JSON-LD object
 */
export function getWordSchema(wordData) {
  if (!wordData) {return null;}

  const { partOfSpeech, definition, meta } = wordData;

  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    'name': wordData.word,
    'description': definition,
    'inDefinedTermSet': {
      '@type': 'DefinedTermSet',
      'name': seoConfig.siteName,
      'description': seoConfig.defaultDescription,
    },
    ...(partOfSpeech && {
      'additionalType': `https://schema.org/${partOfSpeech.charAt(0).toUpperCase() + partOfSpeech.slice(1)}`,
    }),
    ...(meta && meta.sourceUrl && {
      'url': meta.sourceUrl,
      'citation': meta.attributionText,
    }),
    'datePublished': formatDateToISO(wordData.date),
    'publisher': {
      '@type': 'Organization',
      'name': seoConfig.siteName,
      'description': seoConfig.defaultDescription,
    },
  };
}

/**
 * Convert YYYYMMDD date to ISO format
 * @param {string} dateStr - Date in YYYYMMDD format
 * @returns {string} ISO date string
 */
function formatDateToISO(dateStr) {
  if (!dateStr || dateStr.length !== 8) {return new Date().toISOString().split('T')[0];}

  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);

  return `${year}-${month}-${day}`;
}
