/**
 * Common adapter interfaces for dictionary services
 */

import type { DictionaryDefinition, FetchOptions } from '#types';

/**
 * What an adapter answers for a lookup. Like its definitions, every string is
 * nonblank and every URL absolute http(s); a field the partner did not supply
 * is omitted rather than left empty. isCanonicalResponse checks it.
 */
export interface DictionaryResponse {
  word: string;
  definitions: DictionaryDefinition[];
  meta: {
    source: string;
    attribution?: string;
    url?: string;
  };
  // Optional per-headword capture (pronunciation/audio/etymology) folded into
  // WordEnrichment by buildWordData. Absent for adapters that don't supply it.
  headword?: {
    pronunciation?: string;
    audio?: string;
    etymology?: string;
  };
}

/**
 * A dictionary adapter fetches and translates, and nothing else: the site
 * renders stored records without asking which adapter wrote them.
 */
export interface DictionaryAdapter {
  name: string;

  /**
   * Fetch a word from the dictionary service, translated into the canonical
   * contract
   */
  fetchWordData(word: string, options?: FetchOptions): Promise<DictionaryResponse>;
}

// Adapter independence: an adapter's answer is the canonical contract above,
// and the site renders stored records from their data alone (see
// toDefinitionSegments in utils/definition-text.ts), never through the adapter
// that wrote them. Stored records use this same canonical definition shape.
