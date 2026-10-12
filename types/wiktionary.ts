/**
 * Wiktionary definition endpoint types
 * (https://en.wiktionary.org/api/rest_v1/#/Page%20content/get_page_definition__term_)
 *
 * The answer is an object keyed by language code ("en"), each value a list of
 * usages: one per part-of-speech section of the page. Only the fields the
 * adapter reads and guards are declared; the API also sends `parsedExamples`
 * on a definition. A definition and its examples are HTML.
 */

export interface WiktionaryDefinition {
  definition: string;
  examples?: string[];
}

export interface WiktionaryUsage {
  partOfSpeech: string;
  // The section of the page the usage is from: "English", or "Translingual"
  language: string;
  definitions: WiktionaryDefinition[];
}
