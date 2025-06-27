/**
 * SEO utilities for generating metadata, URLs, and structured data
 */
import { seoConfig } from '~config/seo-config.js';

/**
 * Generate canonical URL for a page
 * @param {string} pathname - Page pathname
 * @returns {string} Full canonical URL
 */
export function getCanonicalUrl(pathname) {
  const base = seoConfig.canonicalBase.replace(/\/$/, '');
  const path = pathname?.replace(/^\//, '') || '';
  return `${base}/${path}`;
}

/**
 * Generate basic SEO metadata for a page
 * @param {Object} options - Options for SEO metadata
 * @param {string} options.title - Page title
 * @param {string} options.description - Page description
 * @param {string} options.pathname - Page pathname
 * @param {string[]} options.keywords - Additional keywords
 * @returns {Object} SEO metadata object
 */
export function generateSeoMetadata({ title, description, pathname, keywords = [] }) {
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
