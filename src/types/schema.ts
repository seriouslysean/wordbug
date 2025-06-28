/**
 * Schema.org types for structured data
 * 
 * Note: astro-seo-schema accepts any valid JSON-LD schema object.
 * We use unknown for flexibility while maintaining type safety in our functions.
 */

// Schema.org structured data - astro-seo-schema accepts any valid JSON-LD
export type SchemaItem = unknown;
export type WebSiteSchema = unknown;
export type DefinedTermSchema = unknown;
export type EducationalOrgSchema = unknown;
export type CollectionPageSchema = unknown;

// Word data interface for schema generation
export interface WordSchemaData {
  word: string;
  date: string;
  definition?: string;
  partOfSpeech?: string;
  meta?: {
    sourceUrl?: string;
    attributionText?: string;
  };
}