/**
 * @fileoverview SEO configuration and utilities
 * Centralized SEO config following Astro best practices
 */

import type { SeoConfig, MetaDescriptionOptions, SeoMetadataOptions, SeoMetadata } from '~/types/seo.ts';

// SEO configuration using environment variables - no fallbacks for security
export const seoConfig: SeoConfig = {
  defaultTitle: import.meta.env.SITE_TITLE,
  defaultDescription: import.meta.env.SITE_DESCRIPTION,
  siteName: import.meta.env.SITE_NAME,
  locale: import.meta.env.SITE_LOCALE,
  canonicalBase: import.meta.env.SITE_URL || import.meta.env.BASE_URL,
  author: import.meta.env.SITE_AUTHOR,
  keywords: import.meta.env.SITE_KEYWORDS?.split(',') || [],
};

/**
 * Generate canonical URL for a page
 */
export function getCanonicalUrl(pathname: string): string {
  const cleanPath = pathname.replace(/\/$/, '') || '';
  const baseUrl = seoConfig.canonicalBase.endsWith('/')
    ? seoConfig.canonicalBase.slice(0, -1)
    : seoConfig.canonicalBase;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Generate page-specific meta description
 */
export function getMetaDescription(options: MetaDescriptionOptions = {}): string {
  const { word, definition, custom } = options;
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
 * Generate basic SEO metadata for a page
 */
export function generateSeoMetadata({ title, description, pathname, keywords = [] }: SeoMetadataOptions): SeoMetadata {
  const pageTitle = title ? `${title} - ${seoConfig.siteName}` : seoConfig.defaultTitle;
  const pageDescription = description || seoConfig.defaultDescription;
  const url = getCanonicalUrl(pathname);
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
