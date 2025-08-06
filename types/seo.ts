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

export interface SeoMetadataOptions {
  title?: string;
  description?: string;
  pathname: string;
  keywords?: string[];
}

export interface SeoMetadata {
  title: string;
  description: string;
  canonical: string;
  openGraph: {
    title: string;
    description: string;
    url: string;
    siteName: string;
    locale: string;
    type: string;
  };
  twitter: {
    card: string;
    title: string;
    description: string;
    site: string;
  };
  keywords: string;
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