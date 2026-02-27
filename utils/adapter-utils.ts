import type { DictionaryResponse, WordData, WordProcessedData } from '#types';
import { isBasePartOfSpeech } from '#constants/parts-of-speech';
import { findValidDefinition } from '#utils/word-data-utils';

/**
 * Wraps fetch to convert network-level failures (DNS, connection refused,
 * timeout) into descriptive errors with adapter context.
 * fetch throws TypeError on network failures — this ensures callers get
 * a meaningful message instead of a raw "fetch failed".
 */
export async function adapterFetch(url: string, adapterName: string): Promise<Response> {
  try {
    return await fetch(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${adapterName} network request failed: ${message}`);
  }
}

/**
 * Throws a structured error for non-OK HTTP responses.
 * Handles 429 (rate limit), 404 (not found), and generic failures.
 */
export function throwOnHttpError(response: Response, word: string): void {
  if (response.status === 429) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? `Word "${word}" not found in dictionary. Please check the spelling.`
        : `Failed to fetch word data: ${response.statusText}`,
    );
  }
}

/**
 * Parses a fetch response as JSON with defensive error handling.
 * Surfaces the raw response text on parse failure for debugging.
 */
export async function parseJsonResponse(response: Response, apiName: string): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    const text = await response.text();
    throw new Error(`Invalid API response (not JSON) from ${apiName}. Response: ${text.slice(0, 200)}`);
  }
}

/**
 * Throws "word not found" with a consistent message.
 */
export function throwWordNotFound(word: string): never {
  throw new Error(`Word "${word}" not found in dictionary. Please check the spelling.`);
}

/**
 * Normalizes a raw POS string using the provided adapter-specific map.
 * Returns a base POS, a mapped POS, or undefined for unmappable values.
 */
export function normalizePOS(raw: string, posMap: Record<string, string>): string | undefined {
  const cleaned = raw.toLowerCase().trim();
  if (isBasePartOfSpeech(cleaned)) {
    return cleaned;
  }
  return posMap[cleaned];
}

/**
 * Shared transformToWordData for all adapters.
 * Converts a DictionaryResponse + date into the stored WordData format.
 */
export function transformToWordData(adapterName: string, response: DictionaryResponse, date: string): WordData {
  return {
    word: response.word,
    date,
    adapter: adapterName,
    data: response.definitions,
    rawData: response,
  };
}

/**
 * Shared transformWordData for all adapters.
 * Extracts the first valid definition for display.
 * Optional processText hook for adapter-specific text transforms (e.g. Wordnik xrefs).
 */
export function transformWordData(
  wordData: WordData,
  defaultAttribution: string,
  processText?: (text: string) => string,
): WordProcessedData {
  if (!wordData?.data || wordData.data.length === 0) {
    return { partOfSpeech: '', definition: '', meta: null };
  }

  const validDefinition = findValidDefinition(wordData.data);
  if (!validDefinition) {
    return { partOfSpeech: '', definition: '', meta: null };
  }

  const fullDefinition = wordData.data.find(d => d.partOfSpeech === validDefinition.partOfSpeech);
  const text = processText ? processText(validDefinition.text) : validDefinition.text;

  return {
    partOfSpeech: validDefinition.partOfSpeech,
    definition: text,
    meta: {
      attributionText: fullDefinition?.attributionText || defaultAttribution,
      sourceDictionary: fullDefinition?.sourceDictionary,
      sourceUrl: fullDefinition?.sourceUrl || '',
    },
  };
}
