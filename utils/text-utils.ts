/**
 * Text formatting and manipulation utilities
 *
 * Pattern recognition functions have been moved to text-pattern-utils.ts
 * and are re-exported here for backward compatibility.
 */

/**
 * Extracts a message string from an unknown thrown value.
 * Centralised here so it's importable by pure utils, Astro wrappers,
 * and CLI loggers without creating cross-boundary dependencies.
 */
export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Lists the individual failures behind a thrown value, in order. An
 * AggregateError (fetchWithFallback throws one when every adapter fails) is
 * expanded; anything else is its own single failure. Callers classify with
 * `.some()` / `.every()` instead of matching the combined message.
 */
export const flattenErrors = (error: unknown): unknown[] =>
  error instanceof AggregateError ? error.errors.flatMap(flattenErrors) : [error];

/**
 * Convert any string to a URL-safe slug
 * @param str - String to convert to slug format
 * @returns URL-safe slug (lowercase, hyphenated, alphanumeric)
 */
export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .replaceAll(/[^\w\s-]/g, '')
    .replaceAll(/\s+/g, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-|-$/g, '');
};

/**
 * Collapse every run of whitespace, line breaks included, into one space and
 * trim both ends, for text drawn on a single line.
 * @param text - Text that may span lines
 * @returns The same words on one line
 */
export const collapseWhitespace = (text: string): string =>
  text.replaceAll(/\s+/g, ' ').trim();

/**
 * Serializes a value as JSON for a `<script type="application/ld+json">`
 * element, which Astro cannot escape without corrupting the JSON. Every `<`
 * is written as the JSON escape `\u003c`, so no string in the value, such as
 * definition text holding `</script>`, can end the element; parsing the
 * result gives back the same value.
 */
export const serializeJsonLd = (value: object | null): string =>
  JSON.stringify(value).replaceAll('<', String.raw`\u003c`);

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
} from '#utils/text-pattern-utils';

/**
 * Count syllables in English word using modern heuristic algorithm
 * Based on vowel groups with linguistic rule adjustments
 * @param word - Word to analyze
 * @returns Estimated syllable count (minimum 1 for non-empty words)
 */
export const countSyllables = (word: string): number => {
  if (!word) {
    return 0;
  }

  const clean = word.toLowerCase().replaceAll(/[^a-z]/g, '');
  if (!clean) {
    return 0;
  }

  // Single letter = 1 syllable
  if (clean.length === 1) {
    return 1;
  }

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
