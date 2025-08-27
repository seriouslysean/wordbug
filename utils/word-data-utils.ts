import type { WordData } from '~types';

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
 * Normalize part of speech to standard categories
 */
export const normalizePartOfSpeech = (partOfSpeech: string): string => {
  const normalized = partOfSpeech.toLowerCase().trim();
  const words = normalized.split(' ');
  
  // Normalize verb variations - if any word is "verb", it's a verb
  if (words.includes('verb')) {
    return 'verb';
  }
  
  // Return the first word for compound parts of speech
  const firstWord = words[0];
  
  // Map of common variations
  const mappings: Record<string, string> = {
    'definite': 'article',
    'indefinite': 'article',
  };
  
  return mappings[firstWord] || firstWord;
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