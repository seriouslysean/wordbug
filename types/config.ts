/**
 * Configuration types
 */

export interface PathConfig {
  words: string;
  pages: string;
  images: string;
  fonts: string;
}

export interface SiteConfig {
  siteId: string;
  siteTitle: string;
  siteDescription: string;
  siteUrl: string;
  basePath: string;
  siteLocale: string;
  siteAuthor: string;
  siteAuthorUrl: string;
  attributionMessage: string;
  keywords: string[];
  wordCurator: string;
  developerName: string;
  developerContact: string;
  developerSite: string;
  thanks: string[];
  siteStandards: string;
}

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  background: string;
  backgroundLight: string;
  text: string;
  textLight: string;
  textLighter: string;
  [key: string]: string;
}

export interface ThemeConfig {
  colors: ThemeColors;
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
    extrabold: number;
  };
  fontSize: {
    xs: string;
    small: string;
    base: string;
    huge: string;
  };
  spacing: {
    small: string;
    base: string;
    large: string;
  };
  contentWidth: {
    small: string;
    medium: string;
    large: string;
    full: string;
  };
  other: {
    borderRadius: string;
    shadowColor: string;
  };
  imageGradient: {
    light: string;
    default: string;
    dark: string;
  };
}

export interface EnvironmentConfig {
  // Site configuration
  SITE_ID: string;
  SITE_TITLE: string;
  SITE_DESCRIPTION: string;
  SITE_URL: string;
  SITE_LOCALE: string;
  SITE_AUTHOR: string;
  SITE_AUTHOR_URL?: string;
  SITE_ATTRIBUTION_MESSAGE?: string;
  SITE_KEYWORDS?: string;

  // Build configuration
  BASE_PATH: string;
  BASE_URL: string;

  // API configuration
  WORDNIK_API_KEY: string;
  WORDNIK_API_URL: string;
  WORDNIK_WEBSITE_URL: string;

  // Feature flags
  SENTRY_ENABLED?: string;
  DEV?: boolean;
}