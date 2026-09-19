import type { WordIndexEntry } from '#types';
import { isRecord, isString } from '#utils/type-guards';

/**
 * Type guard for the fetched /words.json index. Client scripts check the
 * response with this before caching it, so a bad deploy or an intercepted
 * response degrades to "no words" instead of throwing mid-search.
 */
export const isWordIndex = (value: unknown): value is WordIndexEntry[] =>
  Array.isArray(value) && value.every(entry => isRecord(entry) && isString(entry.word) && isString(entry.date));
