/**
 * Simple Schema.org types for structured data
 * Focused on educational vocabulary content
 */

import type { SourceMeta } from '#types';

// Website schema - appears on every page
export interface WebSiteSchema {
  '@context': 'https://schema.org';
  '@type': 'WebSite';
  name: string;
  description: string;
  url: string;
  author?: {
    '@type': 'Person';
    name: string;
  };
  audience?: {
    '@type': 'EducationalAudience';
    educationalRole: string;
  };
}

// Word definition schema - for individual word pages
export interface DefinedTermSchema {
  '@context': 'https://schema.org';
  '@type': 'DefinedTerm';
  name: string;
  description: string;
  inDefinedTermSet: {
    '@type': 'DefinedTermSet';
    name: string;
  };
  url?: string;
}

// Collection page schema - for word lists
export interface CollectionPageSchema {
  '@context': 'https://schema.org';
  '@type': 'CollectionPage';
  name: string;
  description: string;
  mainEntity: {
    '@type': 'ItemList';
    numberOfItems: number;
  };
  audience?: {
    '@type': 'EducationalAudience';
    educationalRole: string;
  };
}

// Word data interface for schema generation
export interface WordSchemaData {
  word: string;
  date: string;
  definition?: string;
  partOfSpeech?: string;
  meta?: SourceMeta;
}
