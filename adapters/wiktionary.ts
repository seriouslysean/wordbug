import type {
  DictionaryAdapter,
  DictionaryResponse,
  FreeDictionaryEntry,
} from '#types';
import {
  normalizePOS,
  parseJsonResponse,
  throwOnHttpError,
  throwWordNotFound,
  transformToWordData,
  transformWordData,
} from '#utils/adapter-utils';

const BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

/**
 * Maps Free Dictionary API POS strings to elementary types.
 * The API mostly returns clean values; this handles edge cases.
 */
const POS_MAP: Record<string, string> = {
  'exclamation': 'interjection',
};

export const wiktionaryAdapter: DictionaryAdapter = {
  name: 'wiktionary',

  async fetchWordData(word: string): Promise<DictionaryResponse> {
    const url = `${BASE_URL}/${encodeURIComponent(word)}`;
    const response = await fetch(url);
    throwOnHttpError(response, word);

    const data = await parseJsonResponse(response, 'Wiktionary');

    if (!this.isValidResponse(data)) {
      throwWordNotFound(word);
    }

    const entries = data as FreeDictionaryEntry[];
    const entry = entries[0];
    if (!entry) {
      throwWordNotFound(word);
    }
    const sourceUrl = entry.sourceUrls?.[0] ?? '';
    const attribution = 'from Wiktionary';

    const definitions = entry.meanings.flatMap(meaning => {
      const partOfSpeech = normalizePOS(meaning.partOfSpeech, POS_MAP);
      return meaning.definitions.map(def => ({
        partOfSpeech,
        text: def.definition,
        attributionText: attribution,
        sourceDictionary: 'wiktionary',
        sourceUrl,
        examples: def.example ? [def.example] : undefined,
        synonyms: def.synonyms?.length ? def.synonyms : undefined,
        antonyms: def.antonyms?.length ? def.antonyms : undefined,
      }));
    });

    return {
      word: word.toLowerCase(),
      definitions,
      meta: {
        source: 'Wiktionary',
        attribution,
        url: sourceUrl,
      },
    };
  },

  transformToWordData(response: DictionaryResponse, date: string) {
    return transformToWordData('wiktionary', response, date);
  },

  transformWordData(wordData) {
    return transformWordData(wordData, 'from Wiktionary');
  },

  isValidResponse(response: unknown): boolean {
    if (!Array.isArray(response) || response.length === 0) {
      return false;
    }
    const first = response[0];
    return typeof first === 'object' && first !== null && 'meanings' in first
      && Array.isArray(first.meanings) && first.meanings.length > 0;
  },
};
