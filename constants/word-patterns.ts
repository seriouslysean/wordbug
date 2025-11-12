/**
 * Common word pattern constants for linguistic analysis
 */

export const WORD_ENDINGS = ['ing', 'ed', 'ly', 'ness', 'ful', 'less'] as const;

export type WordEnding = typeof WORD_ENDINGS[number];

/**
 * Check if a word has any of the common endings
 */
export const hasCommonEnding = (word: string): boolean => {
  return WORD_ENDINGS.some(ending => word.endsWith(ending));
};
