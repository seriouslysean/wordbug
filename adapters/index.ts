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
 * Parses DICTIONARY_FALLBACK into an ordered list of adapter names.
 * Supports comma-separated values (e.g. "wordnik,wiktionary").
 * Returns empty array when fallback is unset, empty, or "none".
 */
function parseFallbackChain(): string[] {
  const raw = process.env.DICTIONARY_FALLBACK;
  if (!raw || raw === 'none') {
    return [];
  }
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Fetches word data using the primary adapter, then tries each fallback
 * in DICTIONARY_FALLBACK order (comma-separated) until one succeeds.
 */
export async function fetchWithFallback(word: string, options?: FetchOptions): Promise<FetchResult> {
  const primary = getAdapter();
  try {
    const response = await primary.fetchWordData(word, options);
    return { response, adapterName: primary.name };
  } catch (primaryError) {
    const fallbacks = parseFallbackChain();
    if (fallbacks.length === 0) {
      throw primaryError;
    }

    let lastError: unknown = primaryError;
    for (const fallbackName of fallbacks) {
      logger.warn('Adapter failed, trying fallback', {
        previous: primary.name, fallback: fallbackName, word,
      });
      try {
        const fallback = getAdapterByName(fallbackName);
        const response = await fallback.fetchWordData(word, options);
        return { response, adapterName: fallback.name };
      } catch (fallbackError) {
        lastError = fallbackError;
      }
    }

    throw lastError;
  }
}
