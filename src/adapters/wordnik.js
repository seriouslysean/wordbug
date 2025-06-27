/**
 * @fileoverview Wordnik adapter functions
 * Functional approach for handling Wordnik API data
 */

import { WORDNIK_CONFIG } from '../utils/api-utils.js';

/**
 * Process cross-references in Wordnik text to create proper links
 * @param {string} text - Text containing <xref> tags
 * @returns {string} Text with xrefs converted to Wordnik links
 */
export function processCrossReferences(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  return text.replace(/<xref[^>]*>(.*?)<\/xref>/g, (_match, word) => {
    const cleanWord = word.trim();
    const wordnikUrl = `https://www.wordnik.com/words/${encodeURIComponent(cleanWord.toLowerCase())}`;
    return `<a href="${wordnikUrl}" target="_blank" rel="noopener noreferrer" class="xref-link">${cleanWord}</a>`;
  });
}

/**
 * Transform existing WordBug data that uses raw Wordnik format
 * @param {Object} existingData - Existing word data with raw Wordnik response
 * @returns {Object} Processed word details
 */
export function transformExistingWordData(existingData) {
  if (!existingData || !existingData.data) {
    return { partOfSpeech: '', definition: '', meta: null };
  }

  // Handle the current format where data is the raw Wordnik response
  const rawData = Array.isArray(existingData.data) ? existingData.data :
    (existingData.data.rawResponse ? existingData.data.rawResponse : []);

  if (rawData.length === 0) {
    // Handle legacy format with meanings
    if (existingData.data.meanings) {
      return transformLegacyData(existingData);
    }
    return { partOfSpeech: '', definition: '', meta: null };
  }

  // Transform new format (raw Wordnik API response)
  for (const item of rawData) {
    if (item.text && item.text.trim()) {
      return {
        partOfSpeech: item.partOfSpeech || '',
        definition: processCrossReferences(item.text),
        meta: {
          attributionText: item.attributionText || 'from Wordnik',
          sourceDictionary: item.sourceDictionary,
          sourceUrl: item.wordnikUrl || item.attributionUrl || 'https://www.wordnik.com',
        },
      };
    }
  }

  return { partOfSpeech: '', definition: '', meta: null };
}

/**
 * Transform legacy format to processed word details
 * @param {Object} legacyData - Legacy format data
 * @returns {Object} Processed word details
 */
function transformLegacyData(legacyData) {
  if (!legacyData.data.meanings) {
    return { partOfSpeech: '', definition: '', meta: null };
  }

  for (const meaning of legacyData.data.meanings) {
    if (!meaning.definitions || !meaning.definitions.length) {continue;}

    const def = meaning.definitions[0];
    if (def && def.definition && def.definition.trim()) {
      const meta = legacyData.data.meta || {};
      return {
        partOfSpeech: meaning.partOfSpeech || '',
        definition: processCrossReferences(def.definition),
        meta: {
          attributionText: meta.attributionText || 'from Wordnik',
          sourceDictionary: meta.sourceDictionary || 'Wordnik',
          sourceUrl: meta.sourceUrl || `https://www.wordnik.com/words/${encodeURIComponent(legacyData.word.toLowerCase())}`,
        },
      };
    }
  }

  return { partOfSpeech: '', definition: '', meta: null };
}

/**
 * Fetch word data from Wordnik API (for future use)
 * @param {string} word - Word to look up
 * @param {Object} options - Lookup options
 * @returns {Promise<Array>} Raw Wordnik API response
 */
export async function fetchWordData(word, options = {}) {
  const apiKey = process.env.WORDNIK_API_KEY;
  if (!apiKey) {
    throw new Error('Wordnik API key is required');
  }

  const limit = options.limit || WORDNIK_CONFIG.DEFAULT_LIMIT;
  const lowercaseWord = word.toLowerCase();
  const url = `${WORDNIK_CONFIG.BASE_URL}/${encodeURIComponent(lowercaseWord)}/definitions?limit=${limit}&includeRelated=false&useCanonical=false&includeTags=false&api_key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded');
    }
    if (response.status === 404) {
      throw new Error(`Word "${word}" not found`);
    }
    throw new Error(`Failed to fetch word data: ${response.statusText}`);
  }

  const data = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No word data found');
  }

  return data;
}
