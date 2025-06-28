/**
 * Schema data generators - provide data, get schemas
 * Uses astro-seo-schema for type-safe JSON-LD generation
 */

import { seoConfig } from './seo-utils.ts';
import type { WebSiteSchema, DefinedTermSchema, EducationalOrgSchema, CollectionPageSchema, WordSchemaData } from '~/types/schema.ts';

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
    inLanguage: 'en-US',
    author: {
      '@type': 'Person',
      name: seoConfig.author,
    },
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: ['student', 'parent', 'teacher'],
    },
    genre: ['Education', 'Reference', 'Vocabulary'],
    keywords: seoConfig.keywords.join(', '),
  };
}

/**
 * Educational organization schema data for homepage
 */
export function getEducationalOrgSchemaData(): EducationalOrgSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: seoConfig.siteName,
    description: seoConfig.defaultDescription,
    url: seoConfig.canonicalBase,
    educationalCredentialAwarded: 'Vocabulary Knowledge',
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: ['student', 'parent', 'teacher'],
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Daily Vocabulary Learning',
      itemListElement: [{
        '@type': 'Course',
        name: 'Word of the Day',
        description: seoConfig.defaultDescription,
        educationalLevel: 'All ages',
        courseMode: 'online',
        isAccessibleForFree: true,
        inLanguage: 'en-US',
      }],
    },
  };
}

/**
 * Generate word schema data from word details
 */
export function getWordSchemaData(wordData: WordSchemaData): DefinedTermSchema | null {
  if (!wordData || !wordData.word) {return null;}

  // @ts-ignore
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': ['DefinedTerm', 'LearningResource'],
    name: wordData.word,
    description: wordData.definition || 'Vocabulary word definition',
    educationalLevel: 'All ages',
    learningResourceType: 'Vocabulary Definition',
    educationalUse: ['Vocabulary Building', 'Language Learning', 'Reading Comprehension'],
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: 'student',
    },
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: seoConfig.siteName,
      description: seoConfig.defaultDescription,
    },
    datePublished: formatDateToISO(wordData.date),
    publisher: {
      '@type': ['Organization', 'EducationalOrganization'],
      name: seoConfig.siteName,
      description: seoConfig.defaultDescription,
    },
    isAccessibleForFree: true,
    inLanguage: 'en-US',
  };

  // Add optional fields if available
  if (wordData.partOfSpeech) {
    schemaData.additionalType = `https://schema.org/${wordData.partOfSpeech.charAt(0).toUpperCase() + wordData.partOfSpeech.slice(1)}`;
  }

  if (wordData.meta?.sourceUrl) {
    schemaData.url = wordData.meta.sourceUrl;
    schemaData.citation = wordData.meta.attributionText;
  }

  return schemaData;
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
      name,
      description,
      numberOfItems: itemCount,
    },
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: 'student',
    },
    isPartOf: {
      '@type': 'WebSite',
      name: seoConfig.siteName,
      url: seoConfig.canonicalBase,
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
