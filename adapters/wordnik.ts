import { decodeHTML } from 'entities';

import type {
  DictionaryAdapter,
  DictionaryResponse,
  WordnikConfig,
  WordnikDefinition,
} from '#types';
import {
  adapterFetch,
  normalizePOS,
  parseJsonResponse,
  throwOnHttpError,
  throwWordNotFound,
  transformToWordData,
  transformWordData,
} from '#utils/adapter-utils';

/**
 * Maps Wordnik POS strings to elementary POS types.
 * Values not in this map AND not already a base POS -> undefined (no POS stored).
 */
const POS_MAP: Record<string, string> = {
  'auxiliary-verb': 'verb',
  'intransitive verb': 'verb',
  'transitive verb': 'verb',
  'phrasal verb': 'verb',
  'proper-noun': 'noun',
  'noun-plural': 'noun',
  'proper noun': 'noun',
  'noun plural': 'noun',
};

/**
 * Configuration constants for Wordnik API integration
 */
export const CONFIG: WordnikConfig = {
  BASE_URL: process.env.WORDNIK_API_URL,
  DEFAULT_LIMIT: 10,
  /** Delay between requests in milliseconds (1 second - Wordnik API best practice) */
  RATE_LIMIT_DELAY: 1000,
  /** Backoff delay after rate limit hit (65 seconds - slightly over 1 minute per Wordnik 429 docs) */
  RATE_LIMIT_BACKOFF: 65000,
};


/**
 * Fetches definitions from Wordnik for a single word.
 * Throws on rate-limit (429), server errors, 404, or empty results.
 */
async function fetchDefinitions(word: string, buildUrl: (w: string) => string): Promise<WordnikDefinition[]> {
  const response = await adapterFetch(buildUrl(word), 'Wordnik');
  throwOnHttpError(response, word);

  const data = await parseJsonResponse(response, 'Wordnik') as WordnikDefinition[];
  if (data.length === 0) {
    throwWordNotFound(word);
  }
  return data;
}

/**
 * Wordnik adapter implementing the generic DictionaryAdapter interface.
 * Provides methods to fetch, transform, and validate word data from the Wordnik API.
 */
export const wordnikAdapter: DictionaryAdapter = {
  name: 'wordnik',

  /**
   * Fetches word data from the Wordnik API
   * @param word - The word to look up (with original capitalization)
   * @param options - Optional fetch parameters (limit, etc.)
   * @returns Promise resolving to a standardized DictionaryResponse
   * @throws Error if API key missing, word not found, rate limited, or request fails
   */
  async fetchWordData(word: string, options: Record<string, unknown> = {}): Promise<DictionaryResponse> {
    const apiKey = process.env.WORDNIK_API_KEY;
    if (!apiKey) {
      throw new Error('Wordnik API key is required');
    }
    const limit = typeof options.limit === 'number' ? options.limit : CONFIG.DEFAULT_LIMIT;
    const baseUrl = CONFIG.BASE_URL;
    if (!baseUrl) {
      throw new Error('WORDNIK_API_URL environment variable is required');
    }

    const buildUrl = (queryWord: string): string =>
      `${baseUrl}/word.json/${encodeURIComponent(queryWord)}/definitions?limit=${limit}&includeRelated=false&useCanonical=false&includeTags=false&api_key=${apiKey}`;

    const data = await fetchDefinitions(word, buildUrl);
    if (!this.isValidResponse(data)) {
      throw new Error('No word data found');
    }
    return {
      word: word.toLowerCase(),
      definitions: data.map((def) => ({
        id: def.id,
        partOfSpeech: def.partOfSpeech ? normalizePOS(def.partOfSpeech, POS_MAP) : undefined,
        text: def.text,
        attributionText: def.attributionText,
        sourceDictionary: def.sourceDictionary,
        sourceUrl: def.wordnikUrl || def.attributionUrl || '',
        examples: def.exampleUses?.map(e => e.text),
        synonyms: def.relatedWords,
        antonyms: [], // Wordnik API doesn't include antonyms in definition responses
      })),
      meta: {
        source: 'Wordnik',
        attribution: data[0]?.attributionText || '',
        url: data[0]?.wordnikUrl || '',
      },
    };
  },

  transformToWordData(response: DictionaryResponse, date: string) {
    return transformToWordData('wordnik', response, date);
  },

  transformWordData(wordData) {
    return transformWordData(wordData, 'from Wordnik', processCrossReferences);
  },

  /**
   * Validates if the API response contains usable word data
   * @param response - The raw API response to validate
   * @returns True if response contains valid data, false otherwise
   */
  isValidResponse(response: unknown): boolean {
    return Array.isArray(response) ? response.length > 0 : !!response;
  },
};

/**
 * Generates a Wordnik website URL for a given word
 * @param word - The word to create a URL for
 * @returns The complete Wordnik URL for the word
 * @throws Error if WORDNIK_WEBSITE_URL environment variable is not set
 */
export function generateWordnikWordUrl(word: string): string {
  const baseUrl = process.env.WORDNIK_WEBSITE_URL;
  if (!baseUrl) {
    throw new Error('WORDNIK_WEBSITE_URL environment variable is required');
  }
  return `${baseUrl}/words/${encodeURIComponent(word.toLowerCase())}`;
}

/**
 * Processes cross-reference tags in Wordnik text and converts them to clickable links
 * @param text - The text containing <xref> tags
 * @returns Text with <xref> tags converted to anchor links
 */
export function processCrossReferences(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  return text.replace(/<xref[^>]*>(.*?)<\/xref>/g, (_match, word) => {
    const cleanWord = word.trim();
    const wordnikUrl = generateWordnikWordUrl(cleanWord);
    return `<a href="${wordnikUrl}" target="_blank" rel="noopener noreferrer" class="xref-link">${cleanWord}</a>`;
  });
}

/**
 * Processes HTML content with Wordnik-specific formatting, handling cross-references and HTML entities
 * @param htmlString - The HTML string to process
 * @param options - Processing options (preserveXrefs: whether to convert xref tags to links)
 * @returns Processed HTML string with cross-references and entities handled
 */
export function processWordnikHTML(
  htmlString: string,
  options: { preserveXrefs?: boolean } = {},
): string {
  if (typeof htmlString !== 'string') {
    return htmlString;
  }

  const { preserveXrefs = true } = options;
  const xrefProcessed = preserveXrefs
    ? processCrossReferences(htmlString)
    : htmlString.replace(/<xref[^>]*>(.*?)<\/xref>/g, '$1');

  return decodeHTML(xrefProcessed);
}
