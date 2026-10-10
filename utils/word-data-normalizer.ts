import type { BasePartOfSpeech } from '#constants/parts-of-speech';
import { isBasePartOfSpeech } from '#constants/parts-of-speech';
import type { DictionaryClassification, DictionaryDefinition, DictionaryReference, WordData } from '#types';
import { assertWellFormedDefinitionMarkup, hasMarkup } from '#utils/definition-markup';
import { parseDefinitionMarkup } from '#utils/definition-text';
import { areValidReferences } from '#utils/reference-utils';
import { isHttpUrl, isNonblankString, isRecord, isString, isStringArray } from '#utils/type-guards';
import { isDictionaryDefinition, isWordData, isWordEnrichment } from '#utils/stored-word-validation';

const WORD_KEYS: ReadonlySet<string> = new Set([
  'word', 'date', 'adapter', 'data', 'enrichment', 'rawData', 'preserveCase',
]);
const DEFINITION_KEYS: ReadonlySet<string> = new Set([
  'id', 'partOfSpeech', 'label', 'text', 'references', 'attributionText', 'sourceDictionary', 'sourceUrl',
  'examples', 'synonyms', 'antonyms',
]);
const LEGACY_REFERENCE_TAG = /<\/?(?:xref|internalxref)(?=[\s/>])/i;

const LEGACY_POS_MAP: Readonly<Record<string, BasePartOfSpeech>> = {
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

const fail = (message: string, filePath: string): never => {
  throw new Error(`${message} in ${filePath}`);
};

const normalizePartOfSpeech = (value: unknown, filePath: string): BasePartOfSpeech | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (!isString(value)) {
    return fail('Invalid part of speech', filePath);
  }
  const cleaned = value.toLowerCase().trim().replace(/[.,;:!?]+$/, '');
  if (isBasePartOfSpeech(cleaned)) {
    return cleaned;
  }
  return Object.hasOwn(LEGACY_POS_MAP, cleaned) ? LEGACY_POS_MAP[cleaned] : undefined;
};

const optionalString = (value: unknown, field: string, filePath: string): string | undefined => {
  if (value === undefined || value === '') {
    return undefined;
  }
  if (!isString(value)) {
    return fail(`Invalid ${field}`, filePath);
  }
  return value.trim() ? value : undefined;
};

const optionalList = (value: unknown, field: string, filePath: string): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (!isStringArray(value)) {
    return fail(`Invalid ${field}`, filePath);
  }
  const normalized = value.filter(isNonblankString);
  return normalized.length > 0 ? normalized : undefined;
};

const readLegacyText = (value: unknown, filePath: string): string => {
  if (!isString(value) && !isStringArray(value)) {
    return fail('Invalid definition text', filePath);
  }
  const joined = Array.isArray(value) ? value.join(' ') : value;
  if (!isNonblankString(joined)) {
    return fail('Blank definition text', filePath);
  }
  return joined;
};

const normalizeReferences = (
  text: string,
  value: unknown,
  filePath: string,
): DictionaryReference[] | undefined => {
  if (value === undefined || (Array.isArray(value) && value.length === 0)) {
    return undefined;
  }
  if (!areValidReferences(text, value)) {
    return fail('Invalid definition references', filePath);
  }
  return value;
};

const classification = (
  partOfSpeech: BasePartOfSpeech | undefined,
  label: string | undefined,
): DictionaryClassification => {
  if (partOfSpeech) {
    return { partOfSpeech };
  }
  if (label) {
    return { label };
  }
  return {};
};

const normalizeDefinition = (value: unknown, filePath: string): DictionaryDefinition => {
  if (!isRecord(value)) {
    return fail('Invalid definition', filePath);
  }
  if (Object.keys(value).some(key => !DEFINITION_KEYS.has(key))) {
    return fail('Unsupported definition field', filePath);
  }

  const hasStoredReferences = Array.isArray(value.references) && value.references.length > 0;
  const legacyText = readLegacyText(value.text, filePath);
  if (hasStoredReferences && !isString(value.text)) {
    return fail('Referenced definition text must be a string', filePath);
  }
  if (!hasStoredReferences) {
    try {
      assertWellFormedDefinitionMarkup(legacyText);
    } catch {
      return fail('Malformed definition markup', filePath);
    }
  }
  const hasTag = !hasStoredReferences && hasMarkup(legacyText);
  const hasLegacyMarker = Array.isArray(value.text)
    || ['references', 'examples', 'synonyms', 'antonyms'].some(field => Array.isArray(value[field]) && value[field].length === 0)
    || (isString(value.partOfSpeech) && normalizePartOfSpeech(value.partOfSpeech, filePath) !== value.partOfSpeech);
  if (hasTag && LEGACY_REFERENCE_TAG.test(legacyText) && !hasLegacyMarker) {
    return fail('Ambiguous legacy reference markup', filePath);
  }
  const parseLegacyMarkup = hasTag && hasLegacyMarker;
  const parsed = parseLegacyMarkup ? parseDefinitionMarkup(legacyText) : { text: legacyText, references: [] };
  if (parseLegacyMarkup) {
    try {
      assertWellFormedDefinitionMarkup(parsed.text);
    } catch {
      return fail('Legacy markup normalizes to malformed tag-shaped text', filePath);
    }
    if (hasMarkup(parsed.text)) {
      return fail('Legacy markup normalizes to ambiguous tag-shaped text', filePath);
    }
  }
  const parsedReferences = parseLegacyMarkup
    ? parsed.references
    : normalizeReferences(parsed.text, value.references, filePath);
  const references = parsedReferences && parsedReferences.length > 0 ? parsedReferences : undefined;
  const partOfSpeech = normalizePartOfSpeech(value.partOfSpeech, filePath);
  const label = optionalString(value.label, 'definition label', filePath);
  if (partOfSpeech && label) {
    return fail('Definition has both part of speech and label', filePath);
  }

  const id = optionalString(value.id, 'definition id', filePath);
  const attributionText = optionalString(value.attributionText, 'attribution text', filePath);
  const sourceDictionary = optionalString(value.sourceDictionary, 'source dictionary', filePath);
  const sourceUrl = optionalString(value.sourceUrl, 'source URL', filePath);
  if (sourceUrl && !isHttpUrl(sourceUrl)) {
    return fail('Invalid source URL', filePath);
  }
  const examples = optionalList(value.examples, 'examples', filePath);
  const synonyms = optionalList(value.synonyms, 'synonyms', filePath);
  const antonyms = optionalList(value.antonyms, 'antonyms', filePath);

  const definition: DictionaryDefinition = {
    ...(id ? { id } : {}),
    ...classification(partOfSpeech, label),
    text: parsed.text,
    ...(references ? { references } : {}),
    ...(attributionText ? { attributionText } : {}),
    ...(sourceDictionary ? { sourceDictionary } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(examples ? { examples } : {}),
    ...(synonyms ? { synonyms } : {}),
    ...(antonyms ? { antonyms } : {}),
  };
  if (!isDictionaryDefinition(definition)) {
    return fail('Normalized definition is not canonical', filePath);
  }
  return definition;
};

export interface NormalizedWordData {
  word: WordData;
  needsClassificationReview: boolean;
}

/** Converts one legacy stored record to the canonical, adapter-output shape. */
export function normalizeWordData(value: unknown, filePath: string): NormalizedWordData {
  if (!isRecord(value)
    || !isNonblankString(value.word)
    || !isNonblankString(value.date)
    || !isNonblankString(value.adapter)
    || !Array.isArray(value.data)
    || value.data.length === 0) {
    return fail('Invalid word data', filePath);
  }
  if (Object.keys(value).some(key => !WORD_KEYS.has(key))) {
    return fail('Unsupported word field', filePath);
  }
  if (value.preserveCase !== undefined && typeof value.preserveCase !== 'boolean') {
    return fail('Invalid preserveCase', filePath);
  }
  if (value.enrichment !== undefined && !isWordEnrichment(value.enrichment)) {
    return fail('Invalid word enrichment', filePath);
  }

  const data = value.data.map(definition => normalizeDefinition(definition, filePath));
  const word: WordData = {
    word: value.word,
    date: value.date,
    adapter: value.adapter,
    ...(value.preserveCase === undefined ? {} : { preserveCase: value.preserveCase }),
    data,
    ...(value.enrichment === undefined ? {} : { enrichment: value.enrichment }),
    ...(value.rawData === undefined ? {} : { rawData: value.rawData }),
  };
  if (!isWordData(word)) {
    return fail('Normalized word data is not canonical', filePath);
  }
  return {
    word,
    needsClassificationReview: data.every(definition => definition.partOfSpeech === undefined),
  };
}
