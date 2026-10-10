/**
 * Part of speech constants for consistent categorization across the application.
 * Used by normalization, translations, and URL generation.
 */

/**
 * The part-of-speech vocabulary. Adapters normalize raw POS values to these at
 * fetch time. An unmappable POS is kept as the definition's `label`, never as
 * its part of speech.
 *
 * Every value is an elementary grammatical category except `abbreviation`,
 * which is a lexical label: Merriam-Webster reports it in the same functional
 * label field (`fl`) as "noun" or "verb", and Wordnik lists it among its
 * part-of-speech types. It is stored alongside the grammatical categories so
 * an entry such as "pb&j" keeps the only label its dictionary gives it.
 */
export const BASE_PARTS_OF_SPEECH = {
  ABBREVIATION: 'abbreviation',
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
 * Type guard: checks whether a string is one of the vocabulary's POS values.
 */
export const isBasePartOfSpeech = (value: string): value is BasePartOfSpeech =>
  BASE_VALUES.has(value);
