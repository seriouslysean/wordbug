/**
 * Text formatting and manipulation utilities
 *
 * Pattern recognition functions have been moved to text-pattern-utils.ts
 * and are re-exported here for backward compatibility.
 */

/**
 * Convert any string to a URL-safe slug
 * @param str - String to convert to slug format
 * @returns URL-safe slug (lowercase, hyphenated, alphanumeric)
 */
export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

// Re-export pattern recognition functions from consolidated module
export {
  isStartEndSame,
  hasDoubleLetters,
  hasTripleLetters,
  hasAlphabeticalSequence,
  getWordEndings,
  isAllVowels,
  isAllConsonants,
  isPalindrome,
  getVowelCount,
  getConsonantCount,
  startsWithVowel,
  endsWithVowel,
} from './text-pattern-utils';

/**
 * Count syllables in English word using modern heuristic algorithm
 * Based on vowel groups with linguistic rule adjustments
 * @param word - Word to analyze
 * @returns Estimated syllable count (minimum 1 for non-empty words)
 */
export const countSyllables = (word: string): number => {
  if (!word) return 0;

  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 0;

  // Single letter = 1 syllable
  if (clean.length === 1) return 1;

  // Count vowel groups - consecutive vowels = 1 syllable
  const vowelGroups = clean.match(/[aeiouy]+/g) || [];
  const baseCount = vowelGroups.length;

  // Apply linguistic adjustments using functional composition
  const adjustments = [
    // Subtract silent 'e' at end (but not if only vowel)
    (count: number) => clean.endsWith('e') && count > 1 ? count - 1 : count,
    // Subtract silent 'ed' endings (except after d/t)
    (count: number) => clean.endsWith('ed') && count > 1 && !clean.match(/[dt]ed$/) ? count - 1 : count,
    // Add syllable for 'le' endings after consonant
    (count: number) => clean.match(/[^aeiou]le$/) ? count + 1 : count,
    // Ensure minimum 1 syllable for any word
    (count: number) => Math.max(1, count)
  ];

  return adjustments.reduce((count, adjust) => adjust(count), baseCount);
};
