/**
 * @fileoverview SEO configuration and utilities
 * Centralized SEO config following Astro best practices
 */

import type { SeoConfig, SeoMetadata,SeoMetadataOptions, SeoMetaDescriptionOptions } from '~types/seo';

// SEO configuration using environment variables - no fallbacks for security
export const seoConfig: SeoConfig = {
  defaultTitle: import.meta.env.SITE_TITLE,
  defaultDescription: import.meta.env.SITE_DESCRIPTION,
  siteName: import.meta.env.SITE_ID,
  locale: import.meta.env.SITE_LOCALE || 'en-US',
  canonicalBase: import.meta.env.SITE_URL || import.meta.env.BASE_URL,
  author: import.meta.env.SITE_AUTHOR,
  authorUrl: import.meta.env.SITE_AUTHOR_URL,
  attributionMessage: import.meta.env.SITE_ATTRIBUTION_MESSAGE,
  keywords: (import.meta.env.SITE_KEYWORDS || '').split(',').filter(Boolean),
};

/**
 * Generate canonical URL for a page
 * Consistently enforces no trailing slash for content pages (except root) and lowercase URLs
 */
export function getCanonicalUrl(pathname: string): string {
  // Convert path to lowercase for consistency
  const lowercasePath = pathname;

  // Normalize path: remove trailing slash except for root path
  const cleanPath = lowercasePath === '/' ? '/' : lowercasePath.replace(/\/$/, '') || '';

  // Normalize baseUrl: ensure no trailing slash
  const baseUrl = seoConfig.canonicalBase.endsWith('/')
    ? seoConfig.canonicalBase.slice(0, -1)
    : seoConfig.canonicalBase;

  // Return the properly formatted canonical URL
  return `${baseUrl}${cleanPath}`;
}

/**
 * Generate page-specific meta description
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
