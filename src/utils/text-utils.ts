import type { TextSyllableSpecialCases } from '~types/utils';

/**
 * @param word - The word to analyze
 * @returns Number of vowels found (case-insensitive)
 */
export const getVowelCount = (word: string): number => {
  if (!word) {
    return 0;
  }
  return (word.match(/[aeiou]/gi) || []).length;
};

/**
 * @param word - The word to analyze
 * @returns Number of consonants found (case-insensitive)
 */
export const getConsonantCount = (word: string): number => {
  if (!word) {
    return 0;
  }
  return (word.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
};

/**
 * Checks if a word reads the same forwards and backwards
 * @param word - The word to check
 * @returns True if the word is a palindrome (case-insensitive)
 */
export const isPalindrome = (word: string): boolean => {
  if (!word) {
    return false;
  }
  const lower = word.toLowerCase();
  return lower === lower.split('').reverse().join('');
};

/**
 * Estimates syllable count using improved algorithm based on linguistic patterns
 * @param word - The word to analyze
 * @returns Estimated number of syllables (minimum 1)
 */
export const countSyllables = (word: string): number => {
  if (!word) {
    return 0;
  }

  const cleanWord = word.toLowerCase().trim();

  // Handle single-letter words
  if (cleanWord.length === 1) {
    return 1;
  }

  // Special cases for common words with irregular syllable patterns
  const specialCases: TextSyllableSpecialCases = {
    'ululated': 4,
    'the': 1,
    'a': 1,
    'an': 1,
    'and': 1,
    'are': 1,
    'as': 1,
    'at': 1,
    'be': 1,
    'by': 1,
    'for': 1,
    'from': 1,
    'has': 1,
    'he': 1,
    'in': 1,
    'is': 1,
    'it': 1,
    'its': 1,
    'of': 1,
    'on': 1,
    'that': 1,
    'to': 1,
    'was': 1,
    'were': 2,
    'will': 1,
    'with': 1,
    'you': 1,
    'your': 1,
    'yours': 1,
  };

  if (specialCases[cleanWord]) {
    return specialCases[cleanWord];
  }

  // Remove trailing silent e (but not if it's the only vowel)
  let processedWord = cleanWord;
  if (processedWord.length > 2 && processedWord.endsWith('e')) {
    const beforeE = processedWord[processedWord.length - 2];
    if (beforeE && !'aeiou'.includes(beforeE)) {
      // Only remove silent e if there are other vowels in the word
      const withoutE = processedWord.slice(0, -1);
      if (/[aeiouy]/i.test(withoutE)) {
        processedWord = withoutE;
      }
    }
  }

  // Handle words ending in -ed (usually silent unless preceded by d or t)
  if (processedWord.endsWith('ed') && processedWord.length > 2) {
    const beforeEd = processedWord[processedWord.length - 3];
    if (beforeEd && !'dt'.includes(beforeEd)) {
      processedWord = processedWord.slice(0, -2);
    }
  }

  // Handle words ending in -es
  if (processedWord.endsWith('es') && processedWord.length > 2) {
    const beforeEs = processedWord[processedWord.length - 3];
    if (beforeEs && 'sxzh'.includes(beforeEs)) {
      // Keep the 'es' as it adds a syllable (like "boxes", "wishes")
    } else {
      processedWord = processedWord.slice(0, -2);
    }
  }

  // Handle y at the beginning (consonant) vs middle/end (vowel)
  processedWord = processedWord.replace(/^y/, '');

  // Count vowel groups (consecutive vowels count as one syllable)
  const vowelGroups = processedWord.match(/[aeiouy]+/gi) || [];
  const syllableCount = vowelGroups.length;

  // Ensure minimum of 1 syllable for any non-empty word
  return Math.max(1, syllableCount);
};

/**
 * @param count - Number of words
 * @returns Formatted string with proper singular/plural form
 */
export const formatWordCount = (count: number): string => {
  return `${count} ${count === 1 ? 'word' : 'words'}`;
};
