export interface WordDefinition {
  definition: string;
  example: string;
  synonyms: string[];
  antonyms: string[];
}

export interface WordMeaning {
  partOfSpeech: string;
  definitions: WordDefinition[];
}

export interface WordMeta {
  attributionText: string;
  sourceDictionary: string;
  sourceUrl: string;
}

export interface WordDataObject {
  word: string;
  phonetic: string;
  phonetics: string[];
  origin: string;
  meanings: WordMeaning[];
  meta: WordMeta;
}

export interface WordDataArrayItem {
  id?: string;
  partOfSpeech?: string;
  attributionText?: string;
  sourceDictionary?: string;
  text?: string;
  sequence?: string;
  score?: number;
  word?: string;
  attributionUrl?: string;
  wordnikUrl?: string;
  citations?: { source?: string; cite?: string }[];
  exampleUses?: { text: string; position?: number }[];
  labels?: { text: string; type?: string }[];
  notes?: string[];
  relatedWords?: string[];
  textProns?: string[];
}

export interface WordData {
  word: string;
  date: string;
  data: WordDataObject | WordDataArrayItem[];
}
