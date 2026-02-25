import type { DictionaryResponse, WordData, WordProcessedData } from '#types';
import { isBasePartOfSpeech } from '#constants/parts-of-speech';
import { findValidDefinition } from '#utils/word-data-utils';

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
