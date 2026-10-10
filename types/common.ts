/**
 * Common shared types used across the application
 * Consolidated from multiple files to reduce duplication
 */

import type { BasePartOfSpeech } from '#constants/parts-of-speech';

// === SHARED META STRUCTURES ===

/**
 * Universal metadata for external sources
 * Used by adapters, word data, and schema generation
 */
export interface SourceMeta {
  attributionText?: string;
  sourceDictionary?: string;
  sourceUrl?: string;
}

/**
 * Log context for structured logging
 */
export interface LogContext {
  [key: string]: unknown;
}

/**
 * Type guard for LogContext. Returns false for primitives, arrays, and Error
 * instances so the logger can safely iterate context entries.
 */
export const isLogContext = (value: unknown): value is LogContext =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Error);

// === PATH AND CONFIGURATION ===

/**
 * Application path configuration
 */
export interface PathConfig {
  words: string;
  pages: string;
  images: string;
  fonts: string;
}

// === UTILITY TYPES ===

/**
 * Special case mappings for text processing
 */
export interface TextProcessingOverrides {
  [key: string]: number;
}

/**
 * Generic fetch options for API calls
 */
export interface FetchOptions {
  limit?: number;
  [key: string]: unknown;
}

/**
 * API rate limiting information
 */
export interface RateLimit {
  remainingMinute: string | null;
  remainingHour: string | null;
  limitMinute: string | null;
  limitHour: string | null;
}

// === DICTIONARY TYPES ===

/**
 * A cross-reference inside a definition: the characters of its text from
 * `start` up to, not including, `end` (JavaScript string offsets) link to
 * `url`, an absolute http(s) URL.
 */
export interface DictionaryReference {
  start: number;
  end: number;
  url: string;
}

/**
 * The fields of a canonical definition other than its classification. Every
 * string is nonblank, every array nonempty and every URL absolute http(s); an
 * adapter or stored-data normalizer omits a field it has no value for. `text`
 * contains no partner tags, though ordinary text and encoded characters may
 * contain `<` or `&`. A
 * cross-reference is one of `references`, which are in order, do not overlap,
 * and each cover nonblank text. The type cannot say so, so
 * isCanonicalResponse in utils/adapter-utils.ts checks it at fetch time.
 */
interface DictionaryDefinitionFields {
  text: string;
  references?: DictionaryReference[];

  id?: string;
  attributionText?: string;
  sourceDictionary?: string;
  sourceUrl?: string;

  examples?: string[];
  synonyms?: string[];
  antonyms?: string[];
}

/**
 * How a definition is classified: a part of speech from the vocabulary, or
 * none. `label` never sits beside a part of speech.
 */
export type DictionaryClassification =
  | {
      partOfSpeech: BasePartOfSpeech;
      label?: never;
    }
  | {
      // Both absent means the partner supplied no classification.
      partOfSpeech?: never;
      // Present only when the partner supplied an unmappable term.
      label?: string;
    };

/**
 * The canonical definition every adapter returns and every word file stores:
 * the partner's vocabulary translated into ours.
 */
export type DictionaryDefinition = DictionaryDefinitionFields & DictionaryClassification;

// === TOOL TYPES ===

/**
 * Result from word entry creation tools
 */
export interface CreateWordEntryResult {
  filePath: string;
  data: DictionaryDefinition[];
}
