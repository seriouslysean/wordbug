/**
 * Common shared types used across the application
 * Consolidated from multiple files to reduce duplication
 */

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
 * Common dictionary definition structure
 * Used by all adapters for consistent data representation
 */
export interface DictionaryDefinition extends SourceMeta {
  id?: string;
  partOfSpeech?: string;
  text?: string;
  examples?: string[];
  synonyms?: string[];
  antonyms?: string[];
}

// === TOOL TYPES ===

/**
 * Result from word entry creation tools
 */
export interface CreateWordEntryResult {
  filePath: string;
  data: DictionaryDefinition[];
}