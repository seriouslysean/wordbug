import { merriamWebsterAdapter } from '#adapters/merriam-webster';
import { wiktionaryAdapter } from '#adapters/wiktionary';
import { wordnikAdapter } from '#adapters/wordnik';
import type { DictionaryAdapter, DictionaryResponse, FetchOptions } from '#types';
import { logger } from '#utils/logger';

const ADAPTER_REGISTRY: Record<string, DictionaryAdapter> = {
  'wordnik': wordnikAdapter,
  'merriam-webster': merriamWebsterAdapter,
  'wiktionary': wiktionaryAdapter,
};

/**
 * Returns a dictionary adapter by its canonical name.
 * Used at build time to dispatch on `wordData.adapter` field.
 */
export function getAdapterByName(name: string): DictionaryAdapter {
  const adapter = ADAPTER_REGISTRY[name.toLowerCase()];
  if (!adapter) {
    throw new Error(`Unknown adapter: ${name}`);
  }
  return adapter;
}

/**
 * Gets the configured primary dictionary adapter based on DICTIONARY_ADAPTER env var.
 */
export function getAdapter(): DictionaryAdapter {
  const name = process.env.DICTIONARY_ADAPTER || 'wordnik';
  logger.info('Using dictionary adapter', { adapter: name });
  return getAdapterByName(name);
}

export interface FetchResult {
  response: DictionaryResponse;
  adapterName: string;
}

/**
 * Fetches word data using the primary adapter, falling back to DICTIONARY_FALLBACK
 * when the primary fails and a fallback is configured.
 */
export async function fetchWithFallback(word: string, options?: FetchOptions): Promise<FetchResult> {
  const primary = getAdapter();
  try {
    const response = await primary.fetchWordData(word, options);
    return { response, adapterName: primary.name };
  } catch (primaryError) {
    const fallbackName = process.env.DICTIONARY_FALLBACK;
    if (!fallbackName || fallbackName === 'none') {
      throw primaryError;
    }

    logger.warn('Primary adapter failed, trying fallback', {
      primary: primary.name, fallback: fallbackName, word,
    });
    const fallback = getAdapterByName(fallbackName);
    const response = await fallback.fetchWordData(word, options);
    return { response, adapterName: fallback.name };
  }
}
