import { merriamWebsterAdapter } from '#adapters/merriam-webster';
import { wiktionaryAdapter } from '#adapters/wiktionary';
import { wordnikAdapter } from '#adapters/wordnik';
import type { DictionaryAdapter, DictionaryResponse, FetchOptions } from '#types';
import { isCanonicalResponse, throwUnexpectedShape, throwWordNotFound } from '#utils/adapter-utils';
import { logger } from '#utils/logger';
import { getErrorMessage } from '#utils/text-utils';
import { isValidDictionaryData } from '#utils/word-data-utils';

const ADAPTER_REGISTRY: Record<string, DictionaryAdapter> = {
  'wordnik': wordnikAdapter,
  'merriam-webster': merriamWebsterAdapter,
  'wiktionary': wiktionaryAdapter,
};

/**
 * Every registered adapter's name, read from the registry itself, so a list
 * of adapters kept anywhere else cannot drift from it.
 */
export function getAdapterNames(): readonly string[] {
  return Object.keys(ADAPTER_REGISTRY);
}

/**
 * Returns a dictionary adapter by its canonical name, for the configured
 * primary and each fallback. The site never looks one up: it renders stored
 * records without their adapter.
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
 * Defaults to "wiktionary" when unset or blank: CI exports an unset
 * repository variable as "", which must not silently drop the fallback.
 * "none", in any case, disables it.
 */
function parseFallbackChain(): string[] {
  const raw = process.env.DICTIONARY_FALLBACK?.trim() || 'wiktionary';
  if (raw.toLowerCase() === 'none') {
    return [];
  }
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Fetches from one adapter and refuses a response that breaks the canonical
 * contract or has no usable definitions. Throwing keeps both on the same path
 * as any other adapter failure, so the chain moves on instead of returning a
 * malformed or empty result, and the fault stays in the final error. A
 * response with no definitions at all is the partner not having the word (a
 * Merriam-Webster entry that is only a cross-reference, a Wiktionary meaning
 * with no definitions), not a changed API, so it is reported as not found
 * before the guard, whose contract requires a definition, would call it a
 * broken shape. buildDictionaryResponse has already refused a list whose
 * every definition was blank, so an empty list here is one the partner sent
 * empty.
 */
async function fetchUsable(adapter: DictionaryAdapter, word: string, options?: FetchOptions): Promise<DictionaryResponse> {
  const response = await adapter.fetchWordData(word, options);
  if (Array.isArray(response.definitions) && response.definitions.length === 0) {
    throwWordNotFound(word);
  }
  if (!isCanonicalResponse(response, word)) {
    throwUnexpectedShape(adapter.name, word);
  }
  if (!isValidDictionaryData(response.definitions)) {
    throw new Error(`${adapter.name} returned no usable definitions for "${word}"`);
  }
  return response;
}

interface AdapterFailure {
  adapter: string;
  error: unknown;
}

/**
 * Fetches word data using the primary adapter, then tries each fallback
 * in DICTIONARY_FALLBACK order (comma-separated) until one succeeds.
 * An adapter succeeds only when its response has usable definitions.
 * With no fallback configured the primary's error is thrown as is. Otherwise
 * an exhausted chain throws one AggregateError holding every adapter's error
 * in chain order, so a fallback's "not found" cannot hide a primary rate limit.
 */
export async function fetchWithFallback(word: string, options?: FetchOptions): Promise<FetchResult> {
  const primary = getAdapter();
  try {
    const response = await fetchUsable(primary, word, options);
    return { response, adapterName: primary.name };
  } catch (primaryError) {
    const fallbacks = parseFallbackChain();
    if (fallbacks.length === 0) {
      throw primaryError;
    }

    const failures: AdapterFailure[] = [{ adapter: primary.name, error: primaryError }];
    for (const fallbackName of fallbacks) {
      const failed = failures.at(-1);
      logger.warn('Adapter failed, trying fallback', {
        adapter: failed?.adapter, error: getErrorMessage(failed?.error), fallback: fallbackName, word,
      });
      try {
        const fallback = getAdapterByName(fallbackName);
        const response = await fetchUsable(fallback, word, options);
        return { response, adapterName: fallback.name };
      } catch (fallbackError) {
        failures.push({ adapter: fallbackName, error: fallbackError });
      }
    }

    const summary = failures.map(({ adapter, error }) => `${adapter}: ${getErrorMessage(error)}`).join(' | ');
    throw new AggregateError(
      failures.map(({ error }) => error),
      `All dictionary adapters failed for "${word}": ${summary}`,
      { cause: primaryError },
    );
  }
}
