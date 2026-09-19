import type {
  DefinitionSegment, DictionaryDefinition, WordData, WordEnrichment, WordGrouping, WordProcessedData, WordSense,
} from '#types';
import type { BasePartOfSpeech } from '#constants/parts-of-speech';
import { BASE_PARTS_OF_SPEECH, isBasePartOfSpeech } from '#constants/parts-of-speech';
import { MAX_SENSE_EXAMPLES } from '#constants/text-patterns';
import { toDefinitionSegments } from '#utils/definition-text';
import { slugify } from '#utils/text-utils';

/**
 * The word a site shows as today's: the newest word dated on or before
 * `today`, or the oldest word when every word is dated later.
 * Words are expected newest first.
 */
export const findCurrentWord = (words: WordData[], today: string): WordData | null =>
  words.find(word => word.date <= today) ?? words.at(-1) ?? null;

/**
 * The words listed below the current word on the homepage: the newest words
 * dated before it, so a word dated later is never shown as previous.
 * Words are expected newest first.
 */
export const getPreviousWords = (words: WordData[], currentWord: WordData | null, count: number): WordData[] =>
  currentWord ? words.filter(word => word.date < currentWord.date).slice(0, count) : [];

/**
 * Get words from a specific year
 */
export const getWordsByYear = (year: string, words: WordData[]): WordData[] => {
  return words.filter(word => word.date.startsWith(year));
};

/**
 * Get available months for a specific year
 */
export const getAvailableMonths = (year: string, words: WordData[]): string[] => {
  const months = new Set(
    words
      .filter(word => word.date.startsWith(year))
      .map(word => word.date.slice(4, 6))
  );
  return Array.from(months).toSorted();
};

/**
 * Get all available years from word data
 */
export const getAvailableYears = (words: WordData[]): string[] => {
  const years = [...new Set(words.map(word => word.date.slice(0, 4)))];
  return years.toSorted((a, b) => b.localeCompare(a));
};

/**
 * Get all available word lengths
 */
export const getAvailableLengths = (words: WordData[]): number[] => {
  const lengths = [...new Set(words.map(word => word.word.length))];
  return lengths.toSorted((a, b) => a - b);
};

/**
 * Get all available starting letters from word data
 */
export const getAvailableLetters = (words: WordData[]): string[] => {
  const letters = [...new Set(
    words
      .map(word => word.word.charAt(0).toLowerCase())
      .filter(letter => letter.match(/[a-z]/))
  )];
  return letters.toSorted();
};

/** A definition the site can show: it has a part of speech and text. */
type DisplayableDefinition = DictionaryDefinition & { partOfSpeech: BasePartOfSpeech };

const hasPartOfSpeechAndText = (def: DictionaryDefinition): def is DisplayableDefinition =>
  typeof def?.partOfSpeech === 'string'
  && isBasePartOfSpeech(def.partOfSpeech)
  && typeof def.text === 'string'
  && def.text.trim().length > 0;

const isAbbreviation = (def: DisplayableDefinition): boolean =>
  def.partOfSpeech === BASE_PARTS_OF_SPEECH.ABBREVIATION;

/**
 * A displayable definition as a page shows it (see toDefinitionSegments).
 */
const getDefinitionSegments = (def: DisplayableDefinition): DefinitionSegment[] =>
  toDefinitionSegments({
    text: def.text,
    ...(def.references ? { references: def.references } : {}),
  });

/**
 * A displayable definition as a page shows it, as plain text: a
 * cross-reference is kept as the words it links.
 */
const getDefinitionPlainText = (def: DisplayableDefinition): string =>
  getDefinitionSegments(def).map(segment => segment.text).join('');

/**
 * The one displayability rule. Everything that shows, counts, groups or accepts
 * a word's definitions goes through it, so those answers cannot disagree.
 *
 * A definition is displayable when it has a part of speech and non-empty text.
 * Abbreviation-labelled definitions are displayable only when the word has no
 * displayable grammatical definition, because a dictionary lookup returns the
 * abbreviations that share a headword's spelling: "sad" comes back with the
 * adjective and with SAD, "seasonal affective disorder", and the page for the
 * adjective must not gain that sense or be listed under abbreviations. "pb&j"
 * comes back with nothing but "peanut butter and jelly", labelled abbreviation,
 * so that is its definition and its part of speech.
 */
export const getDisplayableDefinitions = (definitions: DictionaryDefinition[]): DisplayableDefinition[] => {
  if (!Array.isArray(definitions)) {
    return [];
  }
  const displayable = definitions.filter(hasPartOfSpeechAndText);
  const grammatical = displayable.filter(def => !isAbbreviation(def));
  return grammatical.length > 0 ? grammatical : displayable;
};

/**
 * Add-time acceptance: dictionary data is valid when at least one definition is
 * displayable, so a record is never stored that its own word page could not
 * show. Lives here rather than in the stored-data guard so the rule remains
 * alongside the display logic it delegates to.
 *
 * @param data - Array of dictionary definitions to validate
 * @returns True if the data contains at least one displayable definition
 */
export const isValidDictionaryData = (data: DictionaryDefinition[]): boolean =>
  getDisplayableDefinitions(data).length > 0;

/**
 * Finds a word's first displayable definition. Its text is what a page shows,
 * as plain text: a cross-reference is kept as the words it links, with no
 * whitespace around the whole. Meta descriptions,
 * JSON-LD and the RSS feed use it as it is.
 *
 * @param definitions - Array of dictionary definitions
 * @returns First displayable definition or null if none found
 */
export function findValidDefinition(definitions: DictionaryDefinition[]): { text: string; partOfSpeech: string } | null {
  const [definition] = getDisplayableDefinitions(definitions);
  if (!definition) {
    return null;
  }

  return { text: getDefinitionPlainText(definition), partOfSpeech: definition.partOfSpeech };
}

/**
 * A word's first displayable definition, its part of speech, and the source
 * the definition came from, read from the stored record alone: which adapter
 * wrote the record does not matter. Empty when nothing is displayable, as for
 * a word without data.
 */
export const getWordDetails = (wordData: WordData): WordProcessedData => {
  const [definition] = getDisplayableDefinitions(wordData?.data ?? []);
  if (!definition) {
    return { partOfSpeech: '', definition: '', meta: null };
  }

  const { attributionText, sourceDictionary, sourceUrl } = definition;
  return {
    partOfSpeech: definition.partOfSpeech,
    definition: getDefinitionPlainText(definition),
    meta: { attributionText, sourceDictionary, sourceUrl },
  };
};

/**
 * The parts of speech a word is displayed under, each listed once.
 */
const getWordPartsOfSpeech = (word: WordData): string[] => [
  ...new Set(getDisplayableDefinitions(word.data).map(def => def.partOfSpeech)),
];

/**
 * Get all available parts of speech from word data.
 * Filters to the canonical part-of-speech vocabulary.
 */
export const getAvailablePartsOfSpeech = (words: WordData[]): string[] => {
  const partsOfSpeech = new Set(words.flatMap(getWordPartsOfSpeech).filter(isBasePartOfSpeech));

  return Array.from(partsOfSpeech).toSorted();
};

/**
 * Get words of a specific length
 */
export const getWordsByLength = (length: number, words: WordData[]): WordData[] => {
  return words.filter(word => word.word.length === length);
};

/**
 * Get words starting with a specific letter
 */
export const getWordsByLetter = (letter: string, words: WordData[]): WordData[] => {
  const normalizedLetter = letter.toLowerCase();
  return words.filter(word =>
    word.word.toLowerCase().startsWith(normalizedLetter)
  );
};

/**
 * Get words with a specific part of speech
 */
export const getWordsByPartOfSpeech = (partOfSpeech: string, words: WordData[]): WordData[] => {
  if (!isBasePartOfSpeech(partOfSpeech)) {
    return [];
  }
  return words.filter(word => getWordPartsOfSpeech(word).includes(partOfSpeech));
};

/**
 * Group all words by length in a single pass. Caller looks up by `groups[length]`.
 * Avoids the O(n^2) build-time cost of calling getWordsByLength once per word.
 */
export const groupWordsByLength = (words: WordData[]): WordGrouping<number> =>
  Object.groupBy(words, word => word.word.length);

/**
 * Group all words by first letter (lowercase) in a single pass.
 */
export const groupWordsByLetter = (words: WordData[]): WordGrouping<string> =>
  Object.groupBy(words, word => word.word.charAt(0).toLowerCase());

/**
 * Group all words by year (YYYY from word.date) in a single pass.
 */
export const groupWordsByYear = (words: WordData[]): WordGrouping<string> =>
  Object.groupBy(words, word => word.date.slice(0, 4));

/**
 * Group words by every part of speech they are displayed under. A
 * word appears in every bucket whose POS it has a displayable definition for.
 */
export const groupWordsByPartOfSpeech = (words: WordData[]): WordGrouping<string> => {
  const groups: WordGrouping<string> = {};
  for (const word of words) {
    for (const partOfSpeech of getWordPartsOfSpeech(word)) {
      (groups[partOfSpeech] ??= []).push(word);
    }
  }
  return groups;
};

/**
 * Returns every displayable sense of a word for the senses slider. Excludes
 * compound/derived entries (MW stores e.g. "reading desk" under the "reading"
 * lookup; its `id` differs from the headword) while keeping homographs (same
 * `id`). Each sense carries up to MAX_SENSE_EXAMPLES of its own examples,
 * de-duplicated across the whole word so MW's habit of repeating one example on
 * every shortdef shows each sentence once, on the first sense that carries it.
 * Falls back to the single best definition when the id filter matches nothing,
 * so a word never shows fewer senses than the legacy single display.
 */
export const getWordSenses = (wordData: WordData): WordSense[] => {
  if (!wordData?.data || !Array.isArray(wordData.data)) {
    return [];
  }

  const wordSlug = slugify(wordData.word);
  // Shared across senses so a repeated example is claimed by the first slide.
  const seenExamples = new Set<string>();
  const collectSenseExamples = (def: DictionaryDefinition): string[] => {
    if (!Array.isArray(def.examples)) {
      return [];
    }
    const examples: string[] = [];
    for (const example of def.examples) {
      const trimmed = example.trim();
      const key = trimmed.toLowerCase();
      if (trimmed && !seenExamples.has(key)) {
        seenExamples.add(key);
        examples.push(trimmed);
        if (examples.length >= MAX_SENSE_EXAMPLES) {
          break;
        }
      }
    }
    return examples;
  };

  const displayable = getDisplayableDefinitions(wordData.data);
  const senses = displayable
    .filter(def => !def.id || slugify(def.id) === wordSlug)
    .map(def => ({
      partOfSpeech: def.partOfSpeech,
      segments: getDefinitionSegments(def),
      examples: collectSenseExamples(def),
    }));

  if (senses.length > 0) {
    return senses;
  }

  const [fallback] = displayable;
  return fallback
    ? [{ partOfSpeech: fallback.partOfSpeech, segments: getDefinitionSegments(fallback), examples: [] }]
    : [];
};

/**
 * Derivational suffixes used to match a relation term to a corpus headword that
 * is a derivational form of it (or vice versa) -- e.g. `joyful` -> `joy`,
 * `knowledgeability` -> `knowledge`, `reading` -> `read`. Prefix + suffix (not a
 * lossy stemmer) keeps false positives low: a match requires one string to equal
 * the other plus exactly one of these suffixes.
 */
const DERIVATIONAL_SUFFIXES = new Set([
  's', 'es', 'ed', 'ing', 'er', 'ly', 'y', 'ful', 'less', 'ness',
  'ity', 'ous', 'al', 'ic', 'ical', 'ment', 'tion', 'ation', 'ability',
]);

/**
 * Minimum base length for a derivational match, so demo function words
 * (`a`, `of`, `the`) don't mis-link off a short base + common suffix.
 */
const MIN_DERIVATION_BASE = 3;

/** True when `derived` is `base` plus exactly one recognized derivational suffix. */
const isDerivedForm = (base: string, derived: string): boolean => {
  if (base.length < MIN_DERIVATION_BASE || derived.length <= base.length || !derived.startsWith(base)) {
    return false;
  }
  return DERIVATIONAL_SUFFIXES.has(derived.slice(base.length));
};

/**
 * Matches a relation term to a corpus headword, returning the matched headword
 * (lowercased) or null. Exact match wins outright -- checked against the whole
 * set before any suffix scan -- so `they` resolves to itself, never `the` + -y.
 * Failing exact, a bidirectional derivational match links `term` to a headword
 * when either is the other plus a recognized suffix.
 */
export const corpusRelationMatch = (term: string, corpus: Set<string>): string | null => {
  const lower = term.toLowerCase();
  if (corpus.has(lower)) {
    return lower;
  }
  for (const headword of corpus) {
    if (isDerivedForm(headword, lower) || isDerivedForm(lower, headword)) {
      return headword;
    }
  }
  return null;
};

/**
 * Resolves relation terms to the corpus headwords they link to: maps each term
 * through {@link corpusRelationMatch}, drops non-matches, drops self-links to
 * `source` (e.g. the joy page's own `joyful`/`joyous`), and dedupes. Returns
 * lowercased corpus headwords ready to display and link.
 */
export const corpusRelations = (
  source: string,
  terms: string[],
  corpus: Set<string>,
): string[] => {
  const sourceLower = source.toLowerCase();
  const seen = new Set<string>();
  const result: string[] = [];
  for (const term of terms) {
    const match = corpusRelationMatch(term, corpus);
    if (!match || match === sourceLower || seen.has(match)) {
      continue;
    }
    seen.add(match);
    result.push(match);
  }
  return result;
};

// Stored key order for enrichment, shared by every writer so a refresh that
// changes nothing produces no diff.
const ENRICHMENT_TEXT_FIELDS = ['pronunciation', 'audio', 'etymology'] as const;
const ENRICHMENT_LIST_FIELDS = ['synonyms', 'antonyms', 'related'] as const;

/**
 * Merges refreshed enrichment over what a word file already stores. A field
 * the refresh supplies replaces the stored value; a field it does not supply
 * (absent, empty string, empty list) keeps the stored value, so a fallback
 * adapter or a failed WordNet lookup cannot erase earlier enrichment.
 * Returns undefined when neither side has anything to store.
 */
export const mergeEnrichment = (
  stored: WordEnrichment | undefined,
  refreshed: WordEnrichment | undefined,
): WordEnrichment | undefined => {
  const merged: WordEnrichment = {};

  for (const field of ENRICHMENT_TEXT_FIELDS) {
    const value = refreshed?.[field] || stored?.[field];
    if (value) {
      merged[field] = value;
    }
  }

  for (const field of ENRICHMENT_LIST_FIELDS) {
    const value = refreshed?.[field]?.length ? refreshed[field] : stored?.[field];
    if (value?.length) {
      merged[field] = value;
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
};
