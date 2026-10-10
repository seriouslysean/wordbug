/**
 * SEO-related types
 */

export interface SeoConfig {
  defaultTitle: string;
  defaultDescription: string;
  siteName: string;
  locale: string;
  author: string;
  authorUrl?: string;
  attributionMessage?: string;
  keywords: string[];
}

export interface SeoMetaDescriptionOptions {
  word?: string;
  definition?: string;
  custom?: string;
}

export interface PageMetadata {
  path: string;
  title?: string;
  description?: string;
  count?: number;
}

export interface PageMetadataResult {
  title: string;
  description: string;
  category?: string;
  type?: string;
}

export interface AstroStaticPath {
  params: Record<string, string>;
  props?: Record<string, unknown>;
}