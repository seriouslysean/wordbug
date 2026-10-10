import type { DictionaryReference } from '#types';
import { isHttpUrl, isNonblankString, isRecord } from '#utils/type-guards';

const REFERENCE_KEYS: ReadonlySet<string> = new Set(['start', 'end', 'url']);

const isReference = (value: unknown): value is DictionaryReference =>
  isRecord(value)
  && Object.keys(value).every(key => REFERENCE_KEYS.has(key))
  && Number.isInteger(value.start)
  && Number.isInteger(value.end)
  && isHttpUrl(value.url);

/**
 * True when the value is a list of cross-references that fit the text: each
 * starts no earlier than the previous one ended, covers at least one
 * character, stays inside the text, covers nonblank text, and links an
 * absolute http(s) URL. An empty list fits any text.
 */
export const areValidReferences = (text: string, value: unknown): value is DictionaryReference[] =>
  Array.isArray(value)
  && value.every(isReference)
  && value.every(({ start, end }, index) =>
    start >= (value[index - 1]?.end ?? 0)
    && start < end
    && end <= text.length
    && isNonblankString(text.slice(start, end)));
