/**
 * Text pattern recognition utilities for word analysis
 * Consolidated from text-utils.ts and word-stats-utils.ts
 *
 * This module provides pure functions for analyzing text patterns.
 * These functions are framework-agnostic and can be used by CLI tools.
 */

import { TEXT_PATTERNS, COMMON_WORD_ENDINGS, MIN_ALPHABETICAL_SEQUENCE_LENGTH } from '~constants/text-patterns';

/**
 * Check if a word starts and ends with the same letter
 * @param word - Word to evaluate
 * @returns True if first and last letters match and length > 1
 */
export const isStartEndSame = (word: string): boolean => {
  return word.length > 1 && word[0].toLowerCase() === word[word.length - 1].toLowerCase();
};

/**
 * Check if word contains consecutive identical letters
 * @param word - Word to inspect
 * @returns True if word has repeated consecutive letters
 */
export const hasDoubleLetters = (word: string): boolean => {
  return TEXT_PATTERNS.DOUBLE_LETTERS.test(word);
};

/**
 * Check if word contains triple or more consecutive letters
 * @param word - Word to inspect
 * @returns True if word has 3+ repeated letters in a row
 */
export const hasTripleLetters = (word: string): boolean => {
  return TEXT_PATTERNS.TRIPLE_LETTERS.test(word);
};

/**
 * Check for consecutive alphabetical letter sequences (abc, def, etc.)
 * @param word - Word to analyze
 * @returns True if contains 3+ consecutive alphabetical letters
 */
export const hasAlphabeticalSequence = (word: string): boolean => {
  const letters = word.toLowerCase();
  // Subtract (MIN_ALPHABETICAL_SEQUENCE_LENGTH - 1) because we check i, i+1, i+2
  const lookbackOffset = MIN_ALPHABETICAL_SEQUENCE_LENGTH - 1;

  return Array.from(letters)
    .slice(0, -lookbackOffset)
    .some((_, i) => {
      const [firstCharCode, secondCharCode, thirdCharCode] = [
        letters.charCodeAt(i),
        letters.charCodeAt(i + 1),
        letters.charCodeAt(i + 2)
      ];
      const isSequentialAscending =
        secondCharCode === firstCharCode + 1 &&
        thirdCharCode === secondCharCode + 1;
      return isSequentialAscending;
    });
};

/**
 * Get common word endings matched by word
 * @param word - Word to examine
 * @returns Array of matched endings
 */
export const getWordEndings = (word: string): string[] => {
  return COMMON_WORD_ENDINGS.filter(ending => word.endsWith(ending));
};

/**
 * Check if word consists only of vowels
 * @param word - Word to check
 * @returns True if word contains only vowels
 */
export const isAllVowels = (word: string): boolean => {
  return word.length > 0 && TEXT_PATTERNS.ALL_VOWELS.test(word);
};

/**
 * Check if word consists only of consonants
 * @param word - Word to check
 * @returns True if word contains only consonants
 */
export const isAllConsonants = (word: string): boolean => {
  return word.length > 0 && TEXT_PATTERNS.ALL_CONSONANTS.test(word);
};

/**
 * Check if word reads the same forwards and backwards
 * @param word - Word to check
 * @returns True if word is a palindrome (case-insensitive)
 */
export const isPalindrome = (word: string): boolean => {
  if (!word) return false;
  const normalized = word.toLowerCase();
  return normalized === normalized.split('').reverse().join('');
};

/**
 * Count vowels in word
 * @param word - Word to analyze
 * @returns Number of vowels found (case-insensitive)
 */
export const getVowelCount = (word: string): number => {
  return word ? (word.match(TEXT_PATTERNS.VOWELS) || []).length : 0;
};

/**
 * Count consonants in word
 * @param word - Word to analyze
 * @returns Number of consonants found (case-insensitive)
 */
export const getConsonantCount = (word: string): number => {
  return word ? (word.match(TEXT_PATTERNS.CONSONANTS) || []).length : 0;
};

/**
 * Check if word starts with a vowel
 * @param word - Word to check
 * @returns True if word starts with a vowel (case-insensitive)
 * @param word - Word to check
 * @returns True if word starts with a vowel (case-insensitive)
 */
export const startsWithVowel = (word: string): boolean => {
  return TEXT_PATTERNS.STARTS_WITH_VOWEL.test(word);
};

/**
 * Check if word ends with a vowel
 * @param word - Word to check
 * @returns True if word ends with a vowel (case-insensitive)
 */
export const endsWithVowel = (word: string): boolean => {
  return TEXT_PATTERNS.ENDS_WITH_VOWEL.test(word);
};
