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

// Required fields are exactly the ones the adapter's entry guard verifies.
export interface FreeDictionaryEntry {
  word?: string;
  phonetics?: FreeDictionaryPhonetic[];
  meanings: FreeDictionaryMeaning[];
  sourceUrls?: string[];
}
