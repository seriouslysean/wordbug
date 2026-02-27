import type {
  DictionaryAdapter,
  DictionaryResponse,
  MWConfig,
  MWEntry,
  MWSenseData,
  MWSenseItem,
  MWVisTuple,
} from '#types';
import {
  adapterFetch,
  normalizePOS,
  parseJsonResponse,
  throwOnHttpError,
  throwWordNotFound,
  transformToWordData,
  transformWordData,
} from '#utils/adapter-utils';

/**
 * Maps MW functional-label strings to elementary POS types.
 * Values not in this map AND not already a base POS -> undefined (no POS stored).
 */
const POS_MAP: Record<string, string> = {
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
};

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
    .replace(/\{bc\}/g, ': ')
    // Formatting tags: keep inner content
    .replace(/\{(?:it|wi|sc|b)\}(.*?)\{\/(?:it|wi|sc|b)\}/g, '$1')
    // Smart quotes
    .replace(/\{ldquo\}/g, '\u201c')
    .replace(/\{rdquo\}/g, '\u201d')
    // Cross-references and links: extract the word (first pipe segment)
    .replace(/\{(?:sx|a_link|d_link|dxt)\|([^|}]*)[^}]*\}/g, '$1')
    // Any remaining tags
    .replace(/\{[^}]*\}/g, '');
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
        for (const vis of tuple[1] as MWVisTuple[]) {
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
          collectFromSense(data as MWSenseData);
        } else if (type === 'bs') {
          collectFromSense((data as { sense: MWSenseData }).sense);
        } else if (type === 'pseq') {
          // Paragraph sense sequence: array of inner sense items
          for (const innerItem of data as MWSenseItem[]) {
            const [innerType, innerData] = innerItem;
            if (innerType === 'sense' || innerType === 'sen') {
              collectFromSense(innerData as MWSenseData);
            }
          }
        }
      }
    }
  }

  return examples;
}

/**
 * Checks whether a MW API response contains valid entry objects (not string suggestions).
 */
function isEntryArray(data: unknown): data is MWEntry[] {
  return Array.isArray(data) && data.length > 0 && typeof data[0] !== 'string';
}

function buildSourceUrl(word: string): string {
  return `https://www.merriam-webster.com/dictionary/${encodeURIComponent(word)}`;
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

    if (!Array.isArray(data) || data.length === 0) {
      throwWordNotFound(word);
    }

    // String array = suggestions, not entries
    if (typeof data[0] === 'string') {
      const suggestions = (data as string[]).slice(0, 5).join(', ');
      throw new Error(`Word "${word}" not found. Did you mean: ${suggestions}`);
    }

    // Filter to configured dictionary source only
    const dictionary = CONFIG.DICTIONARY;
    const entries = (data as MWEntry[]).filter(entry => entry.meta?.src === dictionary);
    if (entries.length === 0) {
      throw new Error(`Word "${word}" not found in ${getDictionaryLabel()}.`);
    }

    const sourceUrl = buildSourceUrl(word);
    const attribution = `from Merriam-Webster's ${getDictionaryLabel()}`;
    const definitions = entries.flatMap(entry => {
      // Strip homograph suffix from meta.id (e.g., "speed:1" -> "speed")
      const id = entry.meta.id.replace(/:\d+$/, '');
      const partOfSpeech = entry.fl ? normalizePOS(entry.fl, POS_MAP) : undefined;
      const entryExamples = extractExamples(entry);

      return entry.shortdef.map(text => ({
        id,
        partOfSpeech,
        // Normalize colon spacing
        text: text.replace(/ +: +/g, ': '),
        attributionText: attribution,
        sourceDictionary: dictionary,
        sourceUrl,
        examples: entryExamples.length > 0 ? entryExamples : undefined,
      }));
    });

    return {
      word: word.toLowerCase(),
      definitions,
      meta: {
        source: 'Merriam-Webster',
        attribution,
        url: sourceUrl,
      },
    };
  },

  transformToWordData(response: DictionaryResponse, date: string) {
    return transformToWordData('merriam-webster', response, date);
  },

  transformWordData(wordData) {
    return transformWordData(wordData, 'from Merriam-Webster');
  },

  isValidResponse(response: unknown): boolean {
    return isEntryArray(response);
  },
};
