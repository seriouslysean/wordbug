/**
 * Site configuration
 * Consumer repos should override these values in their own site-config.ts
 */

import type { SiteConfig } from '~types/config';

/* global __HUMANS_WORD_CURATOR__, __HUMANS_DEVELOPER_NAME__, __HUMANS_DEVELOPER_CONTACT__, __HUMANS_DEVELOPER_SITE__ */

export const siteConfig: SiteConfig = {
  // Site information
  siteId: import.meta.env.SITE_ID || '',
  siteTitle: import.meta.env.SITE_TITLE || '',
  siteDescription: import.meta.env.SITE_DESCRIPTION || '',
  siteUrl: import.meta.env.SITE_URL || '',
  basePath: import.meta.env.BASE_PATH || '/',
  siteLocale: import.meta.env.SITE_LOCALE || 'en-US',
  siteAuthor: import.meta.env.SITE_AUTHOR || '',
  siteAuthorUrl: import.meta.env.SITE_AUTHOR_URL || '',

  // Attribution
  attributionMessage: import.meta.env.SITE_ATTRIBUTION_MESSAGE || 'Definitions powered by Wordnik',

  // Keywords for SEO
  keywords: import.meta.env.SITE_KEYWORDS?.split(',').filter(Boolean) || [
    'vocabulary',
    'word of the day',
    'education',
    'learning',
    'dictionary',
    'definitions',
  ],

  // Humans.txt configuration
  wordCurator: __HUMANS_WORD_CURATOR__,
  developerName: __HUMANS_DEVELOPER_NAME__,
  developerContact: __HUMANS_DEVELOPER_CONTACT__,
  developerSite: __HUMANS_DEVELOPER_SITE__,
  thanks: ['Wordnik', 'Dictionary contributors worldwide'],
  siteStandards: 'HTML5, CSS3',
};

export default siteConfig;
