import type { DictionaryDefinition, WordData, WordEnrichment } from '#types';
import { isBasePartOfSpeech } from '#constants/parts-of-speech';
import { areValidReferences } from '#utils/reference-utils';
import {
  isHttpUrl, isNonblankString, isOptional, isRecord, isString, isStringArray,
} from '#utils/type-guards';

const DEFINITION_KEYS: ReadonlySet<string> = new Set([
  'id', 'partOfSpeech', 'label', 'text', 'references', 'attributionText', 'sourceDictionary', 'sourceUrl',
  'examples', 'synonyms', 'antonyms',
]);
const WORD_KEYS: ReadonlySet<string> = new Set([
  'word', 'date', 'adapter', 'data', 'enrichment', 'rawData', 'preserveCase',
]);
const ENRICHMENT_KEYS: ReadonlySet<string> = new Set([
  'synonyms', 'antonyms', 'related', 'pronunciation', 'audio', 'etymology',
]);

const hasOnlyDefinitionKeys = (value: Record<string, unknown>): boolean =>
  Object.entries(value).every(([key, field]) => field === undefined || DEFINITION_KEYS.has(key));

const isNonblankStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every(isNonblankString);

const hasValidReferences = (text: string, references: unknown): boolean => {
  if (references === undefined) {
    return true;
  }
  return Array.isArray(references)
    && references.length > 0
    && areValidReferences(text, references);
};

export const isDictionaryDefinition = (value: unknown): value is DictionaryDefinition =>
  isRecord(value)
  && hasOnlyDefinitionKeys(value)
  && isNonblankString(value.text)
  && hasValidReferences(value.text, value.references)
  && (value.partOfSpeech === undefined
    ? isOptional(value.label, isNonblankString)
    : isString(value.partOfSpeech) && isBasePartOfSpeech(value.partOfSpeech) && value.label === undefined)
  && isOptional(value.id, isNonblankString)
  && isOptional(value.attributionText, isNonblankString)
  && isOptional(value.sourceDictionary, isNonblankString)
  && isOptional(value.sourceUrl, isHttpUrl)
  && isOptional(value.examples, isNonblankStringList)
  && isOptional(value.synonyms, isNonblankStringList)
  && isOptional(value.antonyms, isNonblankStringList);

export const isWordEnrichment = (value: unknown): value is WordEnrichment =>
  isRecord(value)
  && Object.keys(value).every(key => ENRICHMENT_KEYS.has(key))
  && isOptional(value.synonyms, isStringArray)
  && isOptional(value.antonyms, isStringArray)
  && isOptional(value.related, isStringArray)
  && isOptional(value.pronunciation, isString)
  && isOptional(value.audio, isString)
  && isOptional(value.etymology, isString);

/**
 * Type guard for a stored word file. Mirrors the fields of the content
 * collection schema in plain predicates, because CLI tools run as plain
 * Node.js and cannot import astro/zod.
 */
export const isWordData = (value: unknown): value is WordData =>
  isRecord(value)
  && Object.keys(value).every(key => WORD_KEYS.has(key))
  && isString(value.word)
  && isString(value.date)
  && isString(value.adapter)
  && Array.isArray(value.data) && value.data.length > 0 && value.data.every(isDictionaryDefinition)
  && isOptional(value.enrichment, isWordEnrichment)
  && isOptional(value.preserveCase, (flag): flag is boolean => typeof flag === 'boolean');

/**
 * Parses the contents of a stored word file. Throws on invalid JSON or on a
 * shape that is not WordData, naming the file so a log-and-skip caller says
 * which one to fix.
 */
export function parseWordData(json: string, filePath: string): WordData {
  const parsed: unknown = JSON.parse(json);
  if (!isWordData(parsed)) {
    throw new Error(`Invalid word data in ${filePath}`);
  }
  return parsed;
}
