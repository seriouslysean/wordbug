import type {
  DictionaryAdapter,
  DictionaryResponse,
  WordnikConfig,
  WordnikDefinition,
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
import { parseDefinitionMarkup } from '#utils/definition-text';
import { isOptional, isRecord, isString, isStringArray } from '#utils/type-guards';

/**
 * Maps Wordnik POS strings to elementary POS types.
 * A value not in this map and not already a base POS is kept as the
 * definition's `label` instead of a part of speech.
 *
 * Wordnik's API spec lists hyphenated values (`verb-transitive`), but as the
 * values of the definitions endpoint's `partOfSpeech` filter; the response
 * field is a free string. A response carries the label of the definition's
 * source dictionary, spaced: the Wordnik records this repository stored
 * before it moved to Merriam-Webster have AHD's `transitive verb` and
 * `phrasal verb`, GCIDE's `noun plural` and Wiktionary's `proper noun`, and
 * no hyphenated value. Both forms are mapped. Name types, affixes, idioms
 * and the verb forms `past-participle` and `imperative` stay labels: neither
 * other adapter maps a participle or a mood to a part of speech.
 */
const POS_MAP = {
  'auxiliary-verb': 'verb',
  'verb-intransitive': 'verb',
  'verb-transitive': 'verb',
  'definite-article': 'article',
  'noun-plural': 'noun',
  // "posessive" is the spec's spelling
  'noun-posessive': 'noun',
  'proper-noun': 'noun',
  'proper-noun-plural': 'noun',
  'proper-noun-posessive': 'noun',
  'intransitive verb': 'verb',
  'transitive verb': 'verb',
  'phrasal verb': 'verb',
  'proper noun': 'noun',
  'noun plural': 'noun',
  'auxiliary verb': 'verb',
  'definite article': 'article',
  // Merriam-Webster defines an initialism as an abbreviation formed from initial letters
  'initialism': 'abbreviation',
} satisfies Readonly<Record<string, BasePartOfSpeech>>;

/**
 * Configuration constants for Wordnik API integration
 */
export const CONFIG: WordnikConfig = {
  BASE_URL: process.env.WORDNIK_API_URL,
  DEFAULT_LIMIT: 10,
  /** Delay between requests in milliseconds (1 second - Wordnik API best practice) */
  RATE_LIMIT_DELAY: 1000,
  /** Backoff delay after rate limit hit (65 seconds - slightly over 1 minute per Wordnik 429 docs) */
  RATE_LIMIT_BACKOFF: 65000,
};


// Wordnik's ExampleUsage model declares `text` optional, so an example without
// it is well-formed; fetchWordData skips it rather than refusing the response.
const isExampleUses = (value: unknown): value is NonNullable<WordnikDefinition['exampleUses']> =>
  Array.isArray(value) && value.every(example => isRecord(example) && isOptional(example.text, isString));

const isRelatedWords = (value: unknown): value is NonNullable<WordnikDefinition['relatedWords']> =>
  Array.isArray(value) && value.every(related => isRecord(related)
    && isOptional(related.relationshipType, isString)
    && isOptional(related.words, isStringArray));

const isTextProns = (value: unknown): value is NonNullable<WordnikDefinition['textProns']> =>
  Array.isArray(value) && value.every(pron => isRecord(pron) && isOptional(pron.raw, isString));

/**
 * Checks every field fetchWordData reads from a definition, including the
 * `relationshipType` and `words` of each relatedWords entry and the `raw` of
 * each textProns entry.
 * All are optional in Wordnik's responses, so a field is either absent or must
 * have the read type.
 */
const isWordnikDefinition = (value: unknown): value is WordnikDefinition =>
  isRecord(value)
  && isOptional(value.id, isString)
  && isOptional(value.partOfSpeech, isString)
  && isOptional(value.text, (text): text is string | string[] => isString(text) || isStringArray(text))
  && isOptional(value.attributionText, isString)
  && isOptional(value.sourceDictionary, isString)
  && isOptional(value.wordnikUrl, isString)
  && isOptional(value.attributionUrl, isString)
  && isOptional(value.exampleUses, isExampleUses)
  && isOptional(value.relatedWords, isRelatedWords)
  && isOptional(value.textProns, isTextProns);

export const isWordnikDefinitions = (value: unknown): value is WordnikDefinition[] =>
  Array.isArray(value) && value.every(isWordnikDefinition);

/**
 * The words of a definition's relations of one type. Only synonyms and
 * antonyms have a field in the canonical definition; other relationship
 * types (same-context, variant, rhyme...) are not read.
 */
const relatedWordsOfType = (def: WordnikDefinition, relationshipType: string): string[] =>
  def.relatedWords?.flatMap(related => (related.relationshipType === relationshipType ? related.words ?? [] : [])) ?? [];

/**
 * Fetches definitions from Wordnik for a single word.
 * Throws on rate-limit (429), server errors, 404, or empty results.
 */
async function fetchDefinitions(word: string, buildUrl: (w: string) => string): Promise<WordnikDefinition[]> {
  const response = await adapterFetch(buildUrl(word), 'Wordnik');
  throwOnHttpError(response, word);

  const data = await parseJsonResponse(response, 'Wordnik');
  if (!isWordnikDefinitions(data)) {
    throwUnexpectedShape('Wordnik', word);
  }
  if (data.length === 0) {
    throwWordNotFound(word);
  }
  return data;
}

/**
 * Wordnik adapter implementing the generic DictionaryAdapter interface:
 * fetches a word's definitions from the Wordnik API and translates them.
 */
export const wordnikAdapter: DictionaryAdapter = {
  name: 'wordnik',

  /**
   * Fetches word data from the Wordnik API
   * @param word - The word to look up (with original capitalization)
   * @param options - Optional fetch parameters (limit, etc.)
   * @returns Promise resolving to a standardized DictionaryResponse
   * @throws Error if API key missing, word not found, rate limited, or request fails
   */
  async fetchWordData(word: string, options: Record<string, unknown> = {}): Promise<DictionaryResponse> {
    const apiKey = process.env.WORDNIK_API_KEY;
    if (!apiKey) {
      throw new Error('Wordnik API key is required');
    }
    const limit = typeof options.limit === 'number' ? options.limit : CONFIG.DEFAULT_LIMIT;
    const baseUrl = CONFIG.BASE_URL;
    if (!baseUrl) {
      throw new Error('WORDNIK_API_URL environment variable is required');
    }

    const buildUrl = (queryWord: string): string =>
      `${baseUrl}/word.json/${encodeURIComponent(queryWord)}/definitions?limit=${limit}&includeRelated=false&useCanonical=false&includeTags=false&api_key=${apiKey}`;

    const data = await fetchDefinitions(word, buildUrl);
    const definitions = data.map(def => {
      // Wordnik occasionally splits text into fragments; the contract has one
      // string. Its Definition model declares text optional: a definition
      // without any is well-formed, and buildDictionaryResponse drops it.
      const markup = Array.isArray(def.text) ? def.text.join(' ') : def.text ?? '';
      // Wordnik marks cross-references up inside the text; the contract has
      // plain text and the references as ranges of it
      const { text, references } = parseDefinitionMarkup(markup);
      return buildDefinition({
        id: def.id,
        partOfSpeech: def.partOfSpeech,
        text,
        references,
        attributionText: def.attributionText,
        sourceDictionary: def.sourceDictionary,
        sourceUrl: def.wordnikUrl || def.attributionUrl,
        examples: def.exampleUses?.flatMap(example => (example.text ? [example.text] : [])),
        synonyms: relatedWordsOfType(def, 'synonym'),
        antonyms: relatedWordsOfType(def, 'antonym'),
      }, POS_MAP);
    });
    const headword = { pronunciation: data[0]?.textProns?.[0]?.raw };
    return buildDictionaryResponse(
      word,
      definitions,
      'Wordnik',
      data[0]?.attributionText,
      data[0]?.wordnikUrl,
      headword,
    );
  },
};
