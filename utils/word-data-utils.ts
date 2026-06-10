import type { DictionaryDefinition, WordData, WordGrouping, WordSense } from '#types';
import { isBasePartOfSpeech } from '#constants/parts-of-speech';
import { MAX_SENSE_EXAMPLES } from '#constants/text-patterns';
import { slugify } from '#utils/text-utils';

/**
 * Finds the first valid definition with a part of speech from word data.
 * Skips definitions without partOfSpeech for cleaner educational content.
 * Handles text as either string or array (Wordnik API inconsistency).
 *
 * @param definitions - Array of dictionary definitions
 * @returns First valid definition or null if none found
 */
export function findValidDefinition(definitions: DictionaryDefinition[]): { text: string; partOfSpeech: string } | null {
  if (!definitions || !Array.isArray(definitions) || definitions.length === 0) {
    return null;
  }

  for (const item of definitions) {
    if (!item.partOfSpeech) {
      continue;
    }

    const textValue = Array.isArray(item.text) ? item.text.join(' ') : item.text;

    if (textValue && typeof textValue === 'string' && textValue.trim()) {
      return {
        text: textValue,
        partOfSpeech: item.partOfSpeech,
      };
    }
  }

  return null;
}

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
      .map(word => word.date.substring(4, 6))
  );
  return Array.from(months).toSorted();
};

/**
 * Get all available years from word data
 */
export const getAvailableYears = (words: WordData[]): string[] => {
  const years = [...new Set(words.map(word => word.date.substring(0, 4)))];
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

/**
 * Backward-compat map for stored data that pre-dates adapter-level POS normalization.
 * Once all data has been re-fetched, this map becomes a no-op.
 */
const LEGACY_POS_MAP: Record<string, string> = {
  'auxiliary verb': 'verb',
  'intransitive verb': 'verb',
  'transitive verb': 'verb',
  'phrasal verb': 'verb',
  'proper noun': 'noun',
  'noun plural': 'noun',
  'plural noun': 'noun',
  'noun phrase': 'noun',
  'noun suffix': 'noun',
  'noun combining form': 'noun',
  'combining form': 'noun',
  'prefix': 'noun',
  'proper-noun': 'noun',
  'noun-plural': 'noun',
  'adjective suffix': 'adjective',
  'definite article': 'article',
  'indefinite article': 'article',
  'auxiliary-verb': 'verb',
  'exclamation': 'interjection',
};

/**
 * Cleans and normalizes a part-of-speech string. Adapters normalize variant POS
 * at fetch time; this is a read-time compat layer for old stored data that maps
 * known variants to base types. Unknown variants pass through unchanged.
 */
export const normalizePartOfSpeech = (partOfSpeech: string): string => {
  const cleaned = partOfSpeech.toLowerCase().trim().replace(/[.,;!?]+$/, '');
  if (isBasePartOfSpeech(cleaned)) {
    return cleaned;
  }
  return LEGACY_POS_MAP[cleaned] ?? cleaned;
};

/**
 * Normalizes a POS string and returns it only if it resolves to a base type.
 * Returns empty string for unmappable or non-base values, so translation keys
 * and display labels never receive unexpected POS strings.
 */
export const normalizeToBasePOS = (raw: string): string => {
  const normalized = normalizePartOfSpeech(raw);
  return isBasePartOfSpeech(normalized) ? normalized : '';
};

/**
 * Get all available parts of speech from word data.
 * Filters to base POS types only — variant values that survive normalization
 * (e.g. "abbreviation", "phrase") are excluded from browse pages.
 */
export const getAvailablePartsOfSpeech = (words: WordData[]): string[] => {
  const partsOfSpeech = new Set<string>();

  words.forEach(word => {
    if (word.data && Array.isArray(word.data)) {
      word.data.forEach(definition => {
        if (definition.partOfSpeech) {
          const normalized = normalizePartOfSpeech(definition.partOfSpeech);
          if (isBasePartOfSpeech(normalized)) {
            partsOfSpeech.add(normalized);
          }
        }
      });
    }
  });

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
  const normalizedPartOfSpeech = normalizePartOfSpeech(partOfSpeech);
  return words.filter(word => {
    if (!word.data || !Array.isArray(word.data)) {
      return false;
    }

    return word.data.some(definition =>
      definition.partOfSpeech && normalizePartOfSpeech(definition.partOfSpeech) === normalizedPartOfSpeech
    );
  });
};

/**
 * Group all words by length in a single pass. Caller looks up by `groups[length]`.
 * Avoids the O(n^2) build-time cost of calling getWordsByLength once per word.
 */
export const groupWordsByLength = (words: WordData[]): WordGrouping<number> =>
  Object.groupBy(words, word => word.word.length) as WordGrouping<number>;

/**
 * Group all words by first letter (lowercase) in a single pass.
 */
export const groupWordsByLetter = (words: WordData[]): WordGrouping<string> =>
  Object.groupBy(words, word => word.word.charAt(0).toLowerCase()) as WordGrouping<string>;

/**
 * Group all words by year (YYYY from word.date) in a single pass.
 */
export const groupWordsByYear = (words: WordData[]): WordGrouping<string> =>
  Object.groupBy(words, word => word.date.substring(0, 4)) as WordGrouping<string>;

/**
 * Group words by every normalized part of speech they carry. A word appears in
 * every bucket whose POS it has a definition for.
 */
export const groupWordsByPartOfSpeech = (words: WordData[]): WordGrouping<string> => {
  const groups: WordGrouping<string> = {};
  for (const word of words) {
    if (!Array.isArray(word.data)) {
      continue;
    }
    const seen = new Set<string>();
    for (const def of word.data) {
      if (!def.partOfSpeech) {
        continue;
      }
      const normalized = normalizePartOfSpeech(def.partOfSpeech);
      if (seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      (groups[normalized] ??= []).push(word);
    }
  }
  return groups;
};

/**
 * Normalized definition text: joins array text (Wordnik inconsistency) and trims.
 */
const getDefinitionText = (def: DictionaryDefinition): string => {
  const text = Array.isArray(def.text) ? def.text.join(' ') : def.text;
  return typeof text === 'string' ? text.trim() : '';
};

/**
 * True when a definition has a part of speech and non-empty text.
 */
export const isValidDefinition = (def: DictionaryDefinition): boolean =>
  Boolean(def.partOfSpeech) && getDefinitionText(def).length > 0;

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

  const senses = wordData.data
    .filter(def => isValidDefinition(def) && (!def.id || slugify(def.id) === wordSlug))
    .map(def => ({
      partOfSpeech: normalizeToBasePOS(def.partOfSpeech ?? ''),
      text: getDefinitionText(def),
      examples: collectSenseExamples(def),
    }));

  if (senses.length > 0) {
    return senses;
  }

  const fallback = findValidDefinition(wordData.data);
  return fallback
    ? [{ partOfSpeech: normalizeToBasePOS(fallback.partOfSpeech), text: fallback.text, examples: [] }]
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

