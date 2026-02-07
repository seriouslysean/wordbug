import type { DictionaryDefinition } from '#types';

/**
 * Validates dictionary data to ensure it contains meaningful content.
 * @param {DictionaryDefinition[]} data - Array of dictionary definitions to validate
 * @returns {boolean} True if the data contains at least one valid definition entry
 */
export function isValidDictionaryData(data: DictionaryDefinition[]): boolean {
  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }

  // Valid if at least one entry has definition text or part of speech
  return data.some(entry =>
    (typeof entry.text === 'string' && entry.text.trim().length > 0) ||
    (typeof entry.partOfSpeech === 'string' && entry.partOfSpeech.trim().length > 0),
  );
}