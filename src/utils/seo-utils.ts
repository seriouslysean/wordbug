/**
 * @fileoverview SEO configuration and utilities
 * Centralized SEO config following Astro best practices
 */

import {
  SITE_TITLE, SITE_DESCRIPTION, SITE_LOCALE,
  SITE_AUTHOR, SITE_AUTHOR_URL, SITE_ATTRIBUTION_MESSAGE, SITE_KEYWORDS,
} from 'astro:env/client';
import type { SeoConfig, SeoMetaDescriptionOptions } from '#types';

export const seoConfig: SeoConfig = {
  defaultTitle: SITE_TITLE,
  defaultDescription: SITE_DESCRIPTION,
  // The name people and crawlers read. SITE_ID is a machine identifier.
  siteName: SITE_TITLE,
  locale: SITE_LOCALE,
  author: SITE_AUTHOR,
  authorUrl: SITE_AUTHOR_URL,
  attributionMessage: SITE_ATTRIBUTION_MESSAGE,
  keywords: SITE_KEYWORDS.split(',').filter(Boolean),
};


/**
 * Generate page-specific meta description
 * @param [options={}] - Description options
 * @returns Generated meta description
 */
export function getMetaDescription(options: SeoMetaDescriptionOptions = {}): string {
  const { word, definition, custom } = options;
  if (custom) {
return custom;
}

  if (word && definition) {
    // Truncate definition to ~150 chars for meta description (2025 best practice)
    const shortDef = definition.length > 100
      ? definition.slice(0, 100).trim() + '...'
      : definition;
    return `${word}: ${shortDef} | ${seoConfig.siteName}`;
  }

  return seoConfig.defaultDescription;
}
