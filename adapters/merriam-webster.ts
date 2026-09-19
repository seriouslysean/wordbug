import type {
  DictionaryAdapter,
  DictionaryResponse,
  MWConfig,
  MWDefiningText,
  MWDefinition,
  MWEntry,
  MWHeadwordInfo,
  MWSenseData,
  MWSenseItem,
  MWVisTuple,
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
  WordNotFoundError,
} from '#utils/adapter-utils';
import { isOptional, isRecord, isString, isStringArray } from '#utils/type-guards';

/**
 * Maps MW functional-label strings to elementary POS types.
 * A value not in this map and not already a base POS (e.g. "biographical
 * name") is kept as the definition's `label` instead of a part of speech.
 */
const POS_MAP = {
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
  'adjective suffix': 'adjective',
  'definite article': 'article',
  'indefinite article': 'article',
} satisfies Readonly<Record<string, BasePartOfSpeech>>;

export const CONFIG: MWConfig = {
  BASE_URL: process.env.MERRIAM_WEBSTER_API_URL || 'https://dictionaryapi.com/api/v3/references',
  DICTIONARY: process.env.MERRIAM_WEBSTER_DICTIONARY || 'collegiate',
  DEFAULT_LIMIT: 10,
};

/**
 * Strips Merriam-Webster markup tokens from text.
 * Handles formatting tags, smart quotes, cross-references, and links.
 */
export function stripMarkup(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  return text
    // {bc} -> ": "
    .replaceAll('{bc}', ': ')
    // Formatting tags: keep inner content
    .replaceAll(/\{(?:it|wi|sc|b)\}(.*?)\{\/(?:it|wi|sc|b)\}/g, '$1')
    // Smart quotes
    .replaceAll('{ldquo}', '\u201c')
    .replaceAll('{rdquo}', '\u201d')
    // Cross-references and links: extract the word (first pipe segment)
    .replaceAll(/\{(?:sx|a_link|d_link|dxt)\|([^|}]*)[^}]*\}/g, '$1')
    // Any remaining tags
    .replaceAll(/\{[^}]*\}/g, '');
}

/**
 * Extracts example sentences from an entry's definition tree.
 * Walks def -> sseq -> sense -> dt to find vis tuples.
 */
export function extractExamples(entry: MWEntry): string[] {
  if (!entry.def) {
    return [];
  }

  const examples: string[] = [];

  const collectVisFromDt = (dt: MWSenseData['dt']): void => {
    if (!Array.isArray(dt)) {
      return;
    }
    for (const tuple of dt) {
      if (tuple[0] === 'vis') {
        for (const vis of tuple[1]) {
          const cleaned = stripMarkup(vis.t).trim();
          if (cleaned) {
            examples.push(cleaned);
          }
        }
      }
    }
  };

  const collectFromSense = (sense: MWSenseData): void => {
    collectVisFromDt(sense.dt);
    if (sense.sdsense) {
      collectVisFromDt(sense.sdsense.dt);
    }
  };

  for (const defBlock of entry.def) {
    for (const senseGroup of defBlock.sseq) {
      for (const senseItem of senseGroup) {
        const [type, data] = senseItem;
        if (type === 'sense' || type === 'sen') {
          collectFromSense(data);
        } else if (type === 'bs') {
          collectFromSense(data.sense);
        } else if (type === 'pseq') {
          // Paragraph sense sequence: array of inner sense items
          for (const innerItem of data) {
            const [innerType, innerData] = innerItem;
            if (innerType === 'sense' || innerType === 'sen') {
              collectFromSense(innerData);
            }
          }
        }
      }
    }
  }

  return examples;
}

const isVisTuple = (value: unknown): value is MWVisTuple => isRecord(value) && isString(value.t);

const isDefiningText = (value: unknown): value is MWDefiningText =>
  Array.isArray(value) && isString(value[0])
  && (value[0] !== 'vis' || (Array.isArray(value[1]) && value[1].every(isVisTuple)));

const isDefiningTextArray = (value: unknown): value is MWDefiningText[] =>
  Array.isArray(value) && value.every(isDefiningText);

const isSenseData = (value: unknown): value is MWSenseData =>
  isRecord(value)
  && isOptional(value.dt, isDefiningTextArray)
  && isOptional(value.sdsense, (sd): sd is NonNullable<MWSenseData['sdsense']> =>
    isRecord(sd) && isOptional(sd.dt, isDefiningTextArray));

/**
 * Validates the payload of the sense types extractExamples reads. An
 * undocumented type is never read, so it passes rather than sinking the entry.
 */
const isSenseItem = (value: unknown): value is MWSenseItem => {
  if (!Array.isArray(value)) {
    return false;
  }
  const [type, data]: unknown[] = value;
  switch (type) {
    case 'sense':
    case 'sen':
      return isSenseData(data);
    case 'bs':
      return isRecord(data) && isSenseData(data.sense);
    case 'pseq':
      return Array.isArray(data) && data.every(isSenseItem);
    default:
      return isString(type);
  }
};

const isDefinition = (value: unknown): value is MWDefinition =>
  isRecord(value) && Array.isArray(value.sseq)
  && value.sseq.every(group => Array.isArray(group) && group.every(isSenseItem));

const isPronunciation = (value: unknown): value is NonNullable<MWHeadwordInfo['prs']>[number] =>
  isRecord(value)
  && isOptional(value.mw, isString)
  && isOptional(value.sound, (sound): sound is { audio?: string } =>
    isRecord(sound) && isOptional(sound.audio, isString));

const isHeadwordInfo = (value: unknown): value is MWHeadwordInfo =>
  isRecord(value)
  && isOptional(value.prs, (prs): prs is NonNullable<MWHeadwordInfo['prs']> =>
    Array.isArray(prs) && prs.every(isPronunciation));

const isEtymology = (value: unknown): value is NonNullable<MWEntry['et']> =>
  Array.isArray(value) && value.every(item =>
    Array.isArray(item) && isString(item[0]) && (item[0] !== 'text' || isString(item[1])));

/**
 * Checks every field fetchWordData and extractExamples read from an entry, so
 * a malformed entry is refused up front instead of failing mid-transform.
 */
export const isMWEntry = (value: unknown): value is MWEntry =>
  isRecord(value)
  && isRecord(value.meta) && isString(value.meta.id) && isString(value.meta.src)
  && isOptional(value.hwi, isHeadwordInfo)
  && isOptional(value.fl, isString)
  && isOptional(value.shortdef, isStringArray)
  && isOptional(value.et, isEtymology)
  && isOptional(value.def, (def): def is MWDefinition[] => Array.isArray(def) && def.every(isDefinition));

/**
 * Checks whether a MW API response contains valid entry objects (not string suggestions).
 */
function isEntryArray(data: unknown): data is MWEntry[] {
  return Array.isArray(data) && data.length > 0 && data.every(isMWEntry);
}

function buildSourceUrl(word: string): string {
  return `https://www.merriam-webster.com/dictionary/${encodeURIComponent(word)}`;
}

/**
 * Constructs the MW media URL for a pronunciation audio file. Subdirectory rule
 * (from the MW API docs): a 'bix'/'gg' prefix maps to itself, a leading number
 * or punctuation maps to 'number', otherwise the first character of the filename.
 */
export function buildMwAudioUrl(audio: string | undefined): string | undefined {
  if (!audio) {
    return undefined;
  }
  const first = audio[0];
  let subdir: string;
  if (audio.startsWith('bix')) {
    subdir = 'bix';
  } else if (audio.startsWith('gg')) {
    subdir = 'gg';
  } else if (first && /[a-zA-Z]/.test(first)) {
    subdir = first;
  } else {
    subdir = 'number';
  }
  return `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdir}/${audio}.mp3`;
}

const DICTIONARY_LABELS: Record<string, string> = {
  collegiate: 'Collegiate Dictionary',
  medical: 'Medical Dictionary',
  learners: "Learner's Dictionary",
  sd2: 'Elementary Dictionary',
  sd3: 'Intermediate Dictionary',
  sd4: 'School Dictionary',
  spanish: 'Spanish-English Dictionary',
  ithesaurus: 'Intermediate Thesaurus',
};

function getDictionaryLabel(): string {
  return DICTIONARY_LABELS[CONFIG.DICTIONARY] ?? CONFIG.DICTIONARY;
}


export const merriamWebsterAdapter: DictionaryAdapter = {
  name: 'merriam-webster',

  async fetchWordData(word: string): Promise<DictionaryResponse> {
    const apiKey = process.env.MERRIAM_WEBSTER_API_KEY;
    if (!apiKey) {
      throw new Error('MERRIAM_WEBSTER_API_KEY environment variable is required');
    }

    const url = `${CONFIG.BASE_URL}/${CONFIG.DICTIONARY}/json/${encodeURIComponent(word)}?key=${apiKey}`;
    const response = await adapterFetch(url, 'Merriam-Webster');
    throwOnHttpError(response, word);

    const data = await parseJsonResponse(response, 'Merriam-Webster');

    // Every answer, suggestions included, is an array: anything else means the
    // API changed, which is a fault to report, not a misspelling
    if (!Array.isArray(data)) {
      throwUnexpectedShape('Merriam-Webster', word);
    }
    if (data.length === 0) {
      throwWordNotFound(word);
    }

    // String array = suggestions, not entries
    if (isStringArray(data)) {
      const suggestions = data.slice(0, 5).join(', ');
      throw new WordNotFoundError(`Word "${word}" not found. Did you mean: ${suggestions}`);
    }

    // Filter to configured dictionary source only. Entries from other sources
    // are never read, so only the kept ones have to be well-formed.
    const dictionary = CONFIG.DICTIONARY;
    const entries = data.filter(entry => isRecord(entry) && isRecord(entry.meta) && entry.meta.src === dictionary);
    if (entries.length === 0) {
      throw new WordNotFoundError(`Word "${word}" not found in ${getDictionaryLabel()}.`);
    }
    if (!isEntryArray(entries)) {
      throwUnexpectedShape('Merriam-Webster', word);
    }
    // The API documents shortdef as a top-level member of the entry, at its
    // end, and marks it nowhere as optional; an entry that is only a
    // cross-reference still carries it, empty. With it on no entry the field
    // has moved or been renamed, which is not the word being missing.
    if (entries.every(entry => entry.shortdef === undefined)) {
      throwUnexpectedShape('Merriam-Webster', word);
    }

    const sourceUrl = buildSourceUrl(word);
    const attribution = `from Merriam-Webster's ${getDictionaryLabel()}`;
    const definitions = entries.flatMap(entry => {
      // Strip homograph suffix from meta.id (e.g., "speed:1" -> "speed")
      const id = entry.meta.id.replace(/:\d+$/, '');
      const examples = extractExamples(entry);

      return (entry.shortdef ?? []).map(text => buildDefinition({
        id,
        partOfSpeech: entry.fl,
        // Normalize colon spacing
        text: text.replaceAll(/ +: +/g, ': '),
        attributionText: attribution,
        sourceDictionary: dictionary,
        sourceUrl,
        examples,
      }, POS_MAP));
    });

    // Capture per-headword data from the first matching entry (zero extra calls).
    const firstEntry = entries[0];
    const firstEtymology = firstEntry?.et?.[0];
    const etymologyText = firstEtymology?.[0] === 'text' ? firstEtymology[1] : undefined;
    const headword = {
      pronunciation: firstEntry?.hwi?.prs?.[0]?.mw,
      audio: buildMwAudioUrl(firstEntry?.hwi?.prs?.[0]?.sound?.audio),
      etymology: etymologyText ? stripMarkup(etymologyText) : undefined,
    };

    return buildDictionaryResponse(word, definitions, 'Merriam-Webster', attribution, sourceUrl, headword);
  },
};
