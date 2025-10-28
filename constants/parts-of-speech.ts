/**
 * Part of speech constants for consistent categorization across the application.
 * Used by normalization, translations, and URL generation.
 */

// =====================================================
// Base Part of Speech Types
// =====================================================

/**
 * Base grammatical categories used for word classification.
 * These are the normalized types that appear in translations and URLs.
 */
export const BASE_PARTS_OF_SPEECH = {
  ADJECTIVE: 'adjective',
  ADVERB: 'adverb',
  ARTICLE: 'article',
  CONJUNCTION: 'conjunction',
  DETERMINER: 'determiner',
  IDIOM: 'idiom',
  INITIALISM: 'initialism',
  INTERJECTION: 'interjection',
  MODAL: 'modal',
  NOUN: 'noun',
  PREPOSITION: 'preposition',
  PRONOUN: 'pronoun',
  VERB: 'verb',
} as const;

// =====================================================
// Part of Speech Normalization Map
// =====================================================

/**
 * Maps compound/variant part of speech types from Wordnik API to base types.
 * This enables cleaner categorization while preserving granular source data.
 */
export const PART_OF_SPEECH_NORMALIZATION: Record<string, string> = {
  // Verb variations
  'auxiliary verb': BASE_PARTS_OF_SPEECH.VERB,
  'intransitive verb': BASE_PARTS_OF_SPEECH.VERB,
  'transitive verb': BASE_PARTS_OF_SPEECH.VERB,
  'phrasal verb': BASE_PARTS_OF_SPEECH.VERB,

  // Noun variations
  'proper noun': BASE_PARTS_OF_SPEECH.NOUN,
  'noun plural': BASE_PARTS_OF_SPEECH.NOUN,

  // Article variations
  'definite article': BASE_PARTS_OF_SPEECH.ARTICLE,
} as const;

// =====================================================
// Type Exports
// =====================================================

export type BasePartOfSpeech = typeof BASE_PARTS_OF_SPEECH[keyof typeof BASE_PARTS_OF_SPEECH];
