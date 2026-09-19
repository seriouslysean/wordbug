import type {
  DictionaryAdapter,
  DictionaryResponse,
  FreeDictionaryDefinition,
  FreeDictionaryEntry,
  FreeDictionaryMeaning,
} from '#types';
import type { BasePartOfSpeech } from '#constants/parts-of-speech';
import {
  adapterFetch,
  buildDefinition,
  buildDictionaryResponse,
  parseJsonResponse,
  throwOnHttpError,
  throwUnexpectedShape,
  throwWordNotFound,
} from '#utils/adapter-utils';
import { isOptional, isRecord, isString, isStringArray } from '#utils/type-guards';

const BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

/**
 * Maps Free Dictionary API POS strings to elementary types.
 * The API mostly returns clean values; this handles edge cases. Any other
 * value is kept as the definition's `label` instead of a part of speech.
 */
const POS_MAP = {
  'exclamation': 'interjection',
} satisfies Readonly<Record<string, BasePartOfSpeech>>;

const isDefinition = (value: unknown): value is FreeDictionaryDefinition =>
  isRecord(value)
  && isString(value.definition)
  && isOptional(value.example, isString)
  && isOptional(value.synonyms, isStringArray)
  && isOptional(value.antonyms, isStringArray);

const isMeaning = (value: unknown): value is FreeDictionaryMeaning =>
  isRecord(value)
  && isString(value.partOfSpeech)
  && Array.isArray(value.definitions) && value.definitions.every(isDefinition);

/**
 * Checks every field fetchWordData reads from an entry, down to each
 * definition, so a malformed meaning is refused before the transform runs.
 */
export const isFreeDictionaryEntry = (value: unknown): value is FreeDictionaryEntry =>
  isRecord(value)
  && Array.isArray(value.meanings) && value.meanings.length > 0 && value.meanings.every(isMeaning)
  && isOptional(value.sourceUrls, isStringArray);

/**
 * True when the first entry carries any meanings at all. Separates "the API
 * has nothing for this word" from "the API answered in a shape we cannot read".
 */
const hasMeanings = (value: unknown): value is { meanings: unknown[] } =>
  isRecord(value) && Array.isArray(value.meanings) && value.meanings.length > 0;

export const wiktionaryAdapter: DictionaryAdapter = {
  name: 'wiktionary',

  async fetchWordData(word: string): Promise<DictionaryResponse> {
    const url = `${BASE_URL}/${encodeURIComponent(word)}`;
    const response = await adapterFetch(url, 'Wiktionary');
    throwOnHttpError(response, word);

    const data = await parseJsonResponse(response, 'Wiktionary');

    // Entries come as an array: anything else means the API changed, which is
    // a fault to report, not a misspelling
    if (!Array.isArray(data)) {
      throwUnexpectedShape('Wiktionary', word);
    }
    // Only the first entry is read
    const entry: unknown = data[0];
    if (!hasMeanings(entry)) {
      throwWordNotFound(word);
    }
    if (!isFreeDictionaryEntry(entry)) {
      throwUnexpectedShape('Wiktionary', word);
    }
    const sourceUrl = entry.sourceUrls?.[0];
    const attribution = 'from Wiktionary';

    const definitions = entry.meanings.flatMap(meaning =>
      meaning.definitions.map(def => buildDefinition({
        partOfSpeech: meaning.partOfSpeech,
        text: def.definition,
        attributionText: attribution,
        sourceDictionary: 'wiktionary',
        sourceUrl,
        examples: def.example ? [def.example] : undefined,
        synonyms: def.synonyms,
        antonyms: def.antonyms,
      }, POS_MAP)));

    return buildDictionaryResponse(word, definitions, 'Wiktionary', attribution, sourceUrl);
  },
};
