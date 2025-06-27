/**
 * SEO configuration using environment variables with sensible fallbacks
 * Centralized configuration for SEO-related settings
 */
export const seoConfig = {
  defaultTitle: import.meta.env.SITE_TITLE || 'Bug\'s (Occasional) Word of the Day',
  defaultDescription: import.meta.env.SITE_DESCRIPTION || 'Educational vocabulary site featuring words my son thinks are cool. Daily word definitions from Wordnik with pronunciation, etymology, and cross-references.',
  siteName: import.meta.env.SITE_NAME || 'WordBug',
  locale: import.meta.env.SITE_LOCALE || 'en-US',
  canonicalBase: import.meta.env.SITE_URL || import.meta.env.BASE_URL || 'http://localhost:4321',
  author: import.meta.env.SITE_AUTHOR || 'Sean Kennedy & Jacob Kennedy',
  keywords: (import.meta.env.SITE_KEYWORDS || 'educational,vocabulary,word of the day,education,learning,dictionary,definitions,students,language arts,reading comprehension,homeschool,classroom,study,academic').split(','),
};
