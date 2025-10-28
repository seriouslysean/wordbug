import type { WordData } from '~types';
import { PART_OF_SPEECH_NORMALIZATION } from '~constants/parts-of-speech';

/**
 * Finds the first valid definition with a part of speech from word data.
 * Skips definitions without partOfSpeech for cleaner educational content.
 * Handles text as either string or array (Wordnik API inconsistency).
 *
 * @param definitions - Array of dictionary definitions
 * @returns First valid definition or null if none found
 */
export function findValidDefinition(definitions: any[]): { text: string; partOfSpeech: string } | null {
  if (!definitions || !Array.isArray(definitions) || definitions.length === 0) {
    return null;
  }

  for (const item of definitions) {
    // Skip definitions without a part of speech
    if (!item.partOfSpeech) {
      continue;
    }

    // Handle text as either string or array (Wordnik API inconsistency)
    const textValue = Array.isArray(item.text) ? item.text.join(' ') : item.text;

    if (textValue && typeof textValue === 'string' && textValue.trim()) {
      return {
        text: textValue,
        partOfSpeech: item.partOfSpeech,
      };
    }
  }

  return null;
}

/**
 * Get words from a specific year
 */
export const getWordsByYear = (year: string, words: WordData[]): WordData[] => {
  return words.filter(word => word.date.startsWith(year));
};

/**
 * Get available months for a specific year
 */
export const getAvailableMonths = (year: string, words: WordData[]): string[] => {
  const months = new Set(
    words
      .filter(word => word.date.startsWith(year))
      .map(word => word.date.substring(4, 6))
  );
  return Array.from(months).sort();
};

/**
 * Get all available years from word data
 */
export const getAvailableYears = (words: WordData[]): string[] => {
  const years = [...new Set(words.map(word => word.date.substring(0, 4)))];
  return years.sort((a, b) => b.localeCompare(a));
};

/**
 * Get all available word lengths
 */
export const getAvailableLengths = (words: WordData[]): number[] => {
  const lengths = [...new Set(words.map(word => word.word.length))];
  return lengths.sort((a, b) => a - b);
};

/**
 * Get all available starting letters from word data
 */
export const getAvailableLetters = (words: WordData[]): string[] => {
  const letters = [...new Set(
    words
      .map(word => word.word.charAt(0).toLowerCase())
      .filter(letter => letter.match(/[a-z]/))
  )];
  return letters.sort();
};

/**
 * Normalize part of speech to base grammatical categories.
 * Maps compound and variant types to their base types for cleaner categorization.
 *
 * @param partOfSpeech - Raw part of speech string from dictionary API
 * @returns Normalized base part of speech type
 */
export const normalizePartOfSpeech = (partOfSpeech: string): string => {
  // Remove trailing punctuation and normalize case
  const normalized = partOfSpeech.toLowerCase().trim().replace(/[.,;!?]+$/, '');

  // Check if this exact variant exists in our normalization map
  if (normalized in PART_OF_SPEECH_NORMALIZATION) {
    return PART_OF_SPEECH_NORMALIZATION[normalized];
  }

  // Return as-is if it's already a base type or an unknown type
  return normalized;
};

/**
 * Get all available parts of speech from word data
 */
export const getAvailablePartsOfSpeech = (words: WordData[]): string[] => {
  const partsOfSpeech = new Set<string>();
  
  words.forEach(word => {
    if (word.data && Array.isArray(word.data)) {
      word.data.forEach(definition => {
        if (definition.partOfSpeech) {
          partsOfSpeech.add(normalizePartOfSpeech(definition.partOfSpeech));
        }
      });
    }
  });
  
  return Array.from(partsOfSpeech).sort();
};
