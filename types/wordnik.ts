/**
 * Wordnik API types - External API structures
 */

export interface WordnikDefinition {
  id?: string;
  partOfSpeech?: string;
  attributionText?: string;
  sourceDictionary?: string;
  text?: string;
  sequence?: string | number;
  score?: number;
  word?: string;
  attributionUrl?: string;
  wordnikUrl?: string;
  citations?: Array<{
    source?: string;
    cite?: string;
  }>;
  exampleUses?: Array<{
    text: string;
    position?: number;
  }>;
  labels?: Array<{
    text: string;
    type?: string;
  }>;
  notes?: string[];
  relatedWords?: string[];
  textProns?: string[];
}

export interface WordnikResponse extends Array<WordnikDefinition> {
  rateLimits?: WordnikRateLimit;
}

export interface WordnikRateLimit {
  remainingMinute: string | null;
  remainingHour: string | null;
  limitMinute: string | null;
  limitHour: string | null;
}

export interface WordnikConfig {
  BASE_URL: string;
  DEFAULT_LIMIT: number;
  RATE_LIMIT_DELAY: number;
  RATE_LIMIT_BACKOFF: number;
}

export interface WordnikTextProcessingOptions {
  preserveXrefs?: boolean;
  xrefBaseUrl?: string;
}

export interface WordnikFetchOptions {
  limit?: number;
}