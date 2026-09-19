/**
 * Wordnik API types - External API structures
 */

import type { RateLimit } from '#types';

// Wordnik's "Related" model. Only the fields the adapter reads and guards are
// declared; the API also sends gram and label1-4.
export interface WordnikRelated {
  relationshipType?: string;
  words?: string[];
}

// Wordnik's "TextPron" model. Only the field the adapter reads and guards is
// declared; the API also sends rawType and seq.
export interface WordnikTextPron {
  raw?: string;
}

export interface WordnikDefinition {
  id?: string;
  partOfSpeech?: string;
  attributionText?: string;
  sourceDictionary?: string;
  // Usually a string; Wordnik occasionally returns an array of fragments
  text?: string | string[];
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
    text?: string;
    position?: number;
  }>;
  labels?: Array<{
    text: string;
    type?: string;
  }>;
  notes?: string[];
  relatedWords?: WordnikRelated[];
  textProns?: WordnikTextPron[];
}

export interface WordnikResponse extends Array<WordnikDefinition> {
  rateLimits?: RateLimit;
}

export interface WordnikConfig {
  BASE_URL: string | undefined;
  DEFAULT_LIMIT: number;
  RATE_LIMIT_DELAY: number;
  RATE_LIMIT_BACKOFF: number;
}


