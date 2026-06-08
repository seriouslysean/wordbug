import type { DictionaryDefinition, WordData, WordGrouping } from '#types';
import { isBasePartOfSpeech } from '#constants/parts-of-speech';

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
