/**
 * Free Dictionary API types (dictionaryapi.dev)
 * Aggregates Wiktionary data into a structured JSON API.
 */

export interface FreeDictionaryPhonetic {
  text?: string;
  audio?: string;
}

export interface FreeDictionaryDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

export interface FreeDictionaryMeaning {
  partOfSpeech: string;
  definitions: FreeDictionaryDefinition[];
}

export interface FreeDictionaryEntry {
  word: string;
  phonetics: FreeDictionaryPhonetic[];
  meanings: FreeDictionaryMeaning[];
  sourceUrls: string[];
}
