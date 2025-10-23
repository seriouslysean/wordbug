import { decodeHTML } from 'entities';

import type {
  DictionaryAdapter,
  DictionaryDefinition,
  DictionaryResponse,
  FetchOptions,
  WordData,
  WordProcessedData,
  WordnikConfig,
  WordnikDefinition,
} from '~types';

/**
 * Configuration constants for Wordnik API integration
 */
export const WORDNIK_CONFIG: WordnikConfig = {
  BASE_URL: process.env.WORDNIK_API_URL,
  DEFAULT_LIMIT: 10,
  RATE_LIMIT_DELAY: 1000,
  RATE_LIMIT_BACKOFF: 65000,
};


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
    const limit = (options as FetchOptions).limit || WORDNIK_CONFIG.DEFAULT_LIMIT;
    const baseUrl = WORDNIK_CONFIG.BASE_URL;

    // Try original capitalization first (for proper nouns like "Japan", "PB&J")
    let queryWord = word;
    let url = `${baseUrl}/word.json/${encodeURIComponent(queryWord)}/definitions?limit=${limit}&includeRelated=false&useCanonical=false&includeTags=false&api_key=${apiKey}`;
    let response = await fetch(url);

    // If original case fails with 404, try lowercase as fallback
    if (response.status === 404 && word !== word.toLowerCase()) {
      queryWord = word.toLowerCase();
      url = `${baseUrl}/word.json/${encodeURIComponent(queryWord)}/definitions?limit=${limit}&includeRelated=false&useCanonical=false&includeTags=false&api_key=${apiKey}`;
      response = await fetch(url);
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Word "${word}" not found in dictionary. Please check the spelling.`);
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      throw new Error(`Failed to fetch word data: ${response.statusText}`);
    }
    const data: WordnikDefinition[] = await response.json();
    if (!this.isValidResponse(data)) {
      throw new Error('No word data found');
    }
    return {
      word: word.toLowerCase(),
      definitions: data.map((def) => ({
        id: def.id,
        partOfSpeech: def.partOfSpeech,
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

  /**
   * Transforms a DictionaryResponse to our internal WordData format
   * @param response - The standardized dictionary response
   * @param date - Date string in YYYYMMDD format
   * @returns WordData object for internal storage
   */
  transformToWordData(response: DictionaryResponse, date: string): WordData {
    return {
      word: response.word,
      date,
      adapter: 'wordnik',
      data: response.definitions,
      rawData: response,
    };
  },

  /**
   * Transforms WordData to processed format for display
   * @param wordData - The internal word data structure
   * @returns WordProcessedData with the first valid definition formatted for display
   */
  transformWordData(wordData: WordData): WordProcessedData {
    if (!wordData || !wordData.data || wordData.data.length === 0) {
      return { partOfSpeech: '', definition: '', meta: null };
    }
    for (const item of wordData.data as DictionaryDefinition[]) {
      if (item.text && item.text.trim()) {
        return {
          partOfSpeech: item.partOfSpeech || '',
          definition: item.text,
          meta: {
            attributionText: item.attributionText || 'from Wordnik',
            sourceDictionary: item.sourceDictionary,
            sourceUrl: item.sourceUrl || '',
          },
        };
      }
    }
    return { partOfSpeech: '', definition: '', meta: null };
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
  let result = htmlString;

  if (preserveXrefs) {
    result = processCrossReferences(result);
  } else {
    result = result.replace(/<xref[^>]*>(.*?)<\/xref>/g, '$1');
  }

  if (result.includes('&')) {
    result = decodeHTML(result);
  }

  return result;
}

/**
 * Transforms WordData to processed format for display (standalone function for legacy compatibility)
 * @param wordData - The internal word data structure
 * @returns WordProcessedData with the first valid definition formatted for display
 */
export function transformWordData(wordData: WordData): WordProcessedData {
  if (!wordData || !wordData.data || wordData.data.length === 0) {
    return { partOfSpeech: '', definition: '', meta: null };
  }

  for (const item of wordData.data) {
    if (item.text && item.text.trim()) {
      return {
        partOfSpeech: item.partOfSpeech || '',
        definition: processCrossReferences(item.text),
        meta: {
          attributionText: item.attributionText || 'from Wordnik',
          sourceDictionary: item.sourceDictionary,
          sourceUrl: item.sourceUrl || '',
        },
      };
    }
  }

  return { partOfSpeech: '', definition: '', meta: null };
}

/**
 * Validates if a DictionaryDefinition array contains valid word data
 * @param data - Array of dictionary definitions to validate
 * @returns True if the data contains at least one definition with text or part of speech
 */
export function isValidWordData(data: DictionaryDefinition[]): boolean {
  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }
  return data.some(entry =>
    (typeof entry.text === 'string' && entry.text.trim().length > 0) ||
    (typeof entry.partOfSpeech === 'string' && entry.partOfSpeech.trim().length > 0),
  );
}
