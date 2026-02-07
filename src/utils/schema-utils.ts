/**
 * Schema data generators - provide data, get schemas
 * Simple JSON-LD generation with proper typing
 */

import type { CollectionPageSchema, DefinedTermSchema, WebSiteSchema, WordSchemaData } from '#types';
import { seoConfig } from '#astro-utils/seo-utils';
import { getFullUrl } from '#astro-utils/url-utils';

export const STRUCTURED_DATA_TYPE = {
  WORD_SINGLE: 'WORD_SINGLE',
  WORD_LIST: 'WORD_LIST',
} as const;

export type StructuredDataType = typeof STRUCTURED_DATA_TYPE[keyof typeof STRUCTURED_DATA_TYPE];

/**
 * Global website schema data - included on every page
 * @returns {WebSiteSchema} Base schema.org website data
 */
export function getWebsiteSchemaData(): WebSiteSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: seoConfig.siteName,
    description: seoConfig.defaultDescription,
    url: getFullUrl('/'),
    author: {
      '@type': 'Person',
      name: seoConfig.author,
    },
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: 'student',
    },
  };
}


/**
 * Generate word schema data from word details
 * @param {WordSchemaData} wordData - Word details to serialize
 * @returns {DefinedTermSchema | null} Schema data or null when invalid
 */
export function getWordSchemaData(wordData: WordSchemaData): DefinedTermSchema | null {
  if (!wordData || !wordData.word) {
    return null;
  }

  const schemaData: DefinedTermSchema = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: wordData.word,
    description: wordData.definition || `Definition of ${wordData.word}`,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: seoConfig.siteName,
    },
  };

  if (wordData.meta?.sourceUrl) {
    schemaData.url = wordData.meta.sourceUrl;
  }

  return schemaData;
}

/**
 * Generate collection schema data
 * @param {string} name - Collection name
 * @param {string} description - Description of collection
 * @param {number} itemCount - Number of items in the collection
 * @returns {CollectionPageSchema} Schema data for the collection page
 */
export function getCollectionSchemaData(name: string, description: string, itemCount: number): CollectionPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: itemCount,
    },
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: 'student',
    },
  };
}

/**
 * Generate BreadcrumbList schema for JSON-LD
 * @param breadcrumbs - Array of breadcrumb items with label and href
 * @returns BreadcrumbList schema object or null if no breadcrumbs
 */
export function getBreadcrumbSchema(breadcrumbs: Array<{ label: string; href: string }>) {
  if (!breadcrumbs || breadcrumbs.length === 0) {
    return null;
  }
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: getFullUrl(item.href)
    }))
  };
}
