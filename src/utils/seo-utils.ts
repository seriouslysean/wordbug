/**
 * @fileoverview SEO configuration and utilities
 * Centralized SEO config following Astro best practices
 */

import {
  SITE_TITLE, SITE_DESCRIPTION, SITE_ID, SITE_LOCALE,
  SITE_AUTHOR, SITE_AUTHOR_URL, SITE_ATTRIBUTION_MESSAGE, SITE_KEYWORDS,
} from 'astro:env/client';
import type { SeoConfig, SeoMetadata, SeoMetadataOptions, SeoMetaDescriptionOptions } from '#types';
import { getFullUrl } from '#astro-utils/url-utils';

export const seoConfig: SeoConfig = {
  defaultTitle: SITE_TITLE,
  defaultDescription: SITE_DESCRIPTION,
  siteName: SITE_ID,
  locale: SITE_LOCALE,
  author: SITE_AUTHOR,
  authorUrl: SITE_AUTHOR_URL,
  attributionMessage: SITE_ATTRIBUTION_MESSAGE,
  keywords: SITE_KEYWORDS.split(',').filter(Boolean),
};


/**
 * Generate page-specific meta description
 * @param {SeoMetaDescriptionOptions} [options={}] - Description options
 * @returns {string} Generated meta description
 */
export function getMetaDescription(options: SeoMetaDescriptionOptions = {}): string {
  const { word, definition, custom } = options;
  if (custom) {
return custom;
}

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
 * Generate basic SEO metadata for a page
 * @param {SeoMetadataOptions} param0 - Metadata options
 * @returns {SeoMetadata} SEO metadata object
 */
export function generateSeoMetadata({ title, description, pathname, keywords = [] }: SeoMetadataOptions): SeoMetadata {
  const pageTitle = title ? `${title} - ${seoConfig.siteName}` : seoConfig.defaultTitle;
  const pageDescription = description || seoConfig.defaultDescription;
  const url = getFullUrl(pathname);
  const combinedKeywords = [...seoConfig.keywords, ...keywords].join(', ');

  return {
    title: pageTitle,
    description: pageDescription,
    canonical: url,
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url,
      siteName: seoConfig.siteName,
      locale: seoConfig.locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDescription,
      site: seoConfig.siteName,
    },
    keywords: combinedKeywords,
  };
}
