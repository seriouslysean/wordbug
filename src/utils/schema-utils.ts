/**
 * Schema data generators - provide data, get schemas
 * Simple JSON-LD generation with proper typing
 */

import type { CollectionPageSchema, DefinedTermSchema, WebSiteSchema, WordSchemaData } from '~types/schema';

import { seoConfig } from './seo-utils.ts';

export const STRUCTURED_DATA_TYPE = {
  WORD_SINGLE: 'WORD_SINGLE',
  WORD_LIST: 'WORD_LIST',
} as const;

export type StructuredDataType = typeof STRUCTURED_DATA_TYPE[keyof typeof STRUCTURED_DATA_TYPE];

/**
 * Global website schema data - included on every page
 */
export function getWebsiteSchemaData(): WebSiteSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: seoConfig.siteName,
    description: seoConfig.defaultDescription,
    url: seoConfig.canonicalBase,
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
 */
export function getWordSchemaData(wordData: WordSchemaData): DefinedTermSchema | null {
  if (!wordData || !wordData.word) {
return null;
}

  const schemaData: DefinedTermSchema = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: wordData.word,
    description: wordData.definition || 'Vocabulary word definition',
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: seoConfig.siteName,
    },
  };

  // Add optional fields if available
  // Note: These are not standard DefinedTerm properties, but we're including them
  // in the generated JSON-LD output for educational context
  if (wordData.meta?.sourceUrl) {
    schemaData.url = wordData.meta.sourceUrl;
  }

  // Add non-standard properties directly to the output object
  // This won't affect the TypeScript interface but will be in the JSON-LD output
  const outputSchema = {
    ...schemaData,
    ...(wordData.date && { datePublished: formatDateToISO(wordData.date) }),
    learningResourceType: 'vocabulary definition',
    educationalUse: 'vocabulary building',
  };

  return outputSchema as DefinedTermSchema;
}

/**
 * Generate collection schema data
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
 * Convert YYYYMMDD date to ISO format
 */
function formatDateToISO(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) {
    return new Date().toISOString().split('T')[0];
  }

  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);

  return `${year}-${month}-${day}`;
}
