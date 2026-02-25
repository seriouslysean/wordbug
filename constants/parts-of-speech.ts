/**
 * Part of speech constants for consistent categorization across the application.
 * Used by normalization, translations, and URL generation.
 */

/**
 * Elementary grammatical categories. Adapters normalize raw POS values to these
 * at fetch time. Unknown/unmappable POS becomes undefined (no POS stored).
 */
export const BASE_PARTS_OF_SPEECH = {
  ADJECTIVE: 'adjective',
  ADVERB: 'adverb',
  ARTICLE: 'article',
  CONJUNCTION: 'conjunction',
  DETERMINER: 'determiner',
  INTERJECTION: 'interjection',
  NOUN: 'noun',
  PREPOSITION: 'preposition',
  PRONOUN: 'pronoun',
  VERB: 'verb',
} as const;

export type BasePartOfSpeech = typeof BASE_PARTS_OF_SPEECH[keyof typeof BASE_PARTS_OF_SPEECH];

const BASE_VALUES = new Set<string>(Object.values(BASE_PARTS_OF_SPEECH));

/**
 * Type guard: checks whether a string is one of the elementary POS values.
 */
export const isBasePartOfSpeech = (value: string): value is BasePartOfSpeech =>
  BASE_VALUES.has(value);
