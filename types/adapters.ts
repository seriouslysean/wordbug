/**
 * Common adapter interfaces for dictionary services
 */

import type { DictionaryDefinition,FetchOptions, SourceMeta } from '~types/common';
import type { WordData, WordProcessedData } from '~types/word';

export interface DictionaryResponse {
  word: string;
  definitions: DictionaryDefinition[];
  meta: SourceMeta & {
    source: string;
    attribution: string;
    url: string;
  };
}

export interface DictionaryAdapter {
  name: string;

  /**
   * Fetch word data from the dictionary service
   */
  fetchWordData(word: string, options?: FetchOptions): Promise<DictionaryResponse>;

  /**
   * Transform raw API response to our internal WordData format
   */
  transformToWordData(response: DictionaryResponse, date: string): WordData;

  /**
   * Transform WordData to processed format for display
   */
  transformWordData(wordData: WordData): WordProcessedData;

  /**
   * Validate if the response contains usable word data
   */
  isValidResponse(response: unknown): boolean;
}


// TODO: Future consideration for data format abstraction
// Currently, WordData.data contains adapter-specific response format (WordnikDefinition[])
// For true adapter independence, we'd need:
// 1. Generic storage format that's adapter-agnostic
// 2. Migration strategy for existing Wordnik-formatted data
// 3. Versioning system for data format changes
//
// Potential approach:
// interface WordDataV2 {
//   word: string;
//   date: string;
//   adapter: string;
//   version: number;
//   definitions: DictionaryDefinition[]; // Generic format
//   rawData?: unknown; // Optional original adapter response
// }
//
// This would allow:
// - Adapter-independent queries and processing
// - Backward compatibility through migration
// - Future-proof data storage