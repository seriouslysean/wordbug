/**
 * Merriam-Webster Collegiate Dictionary API types
 * Only fields we access are typed; the full response is preserved in rawData.
 * Required fields are exactly the ones the adapter's entry guard verifies.
 */

export interface MWMeta {
  id: string;
  src: string;
}

export interface MWHeadwordInfo {
  prs?: Array<{
    mw?: string;
    sound?: { audio?: string };
  }>;
}

export interface MWVisTuple {
  t: string;
}

/**
 * One element of a defining-text (`dt`) array, discriminated by its tag.
 * Tags per the MW JSON reference (dictionaryapi.com/products/json, "dt").
 * Only `vis` payloads are read; the rest stay `unknown`. A `[string, unknown]`
 * catch-all would overlap 'vis' and defeat narrowing on the tag.
 */
export type MWDefiningText =
  | ['vis', MWVisTuple[]]
  | ['text' | 'bnw' | 'ca' | 'ri' | 'snote' | 'uns', unknown];

/**
 * A single sense within a definition sequence.
 * MW nests senses deeply: def -> sseq -> [[sense_type, sense_data]]
 */
export type MWSenseItem =
  | ['sense', MWSenseData]
  | ['bs', { sense: MWSenseData }]
  | ['sen', MWSenseData]
  | ['pseq', MWSenseItem[]];

export interface MWSenseData {
  sn?: string;
  // Absent on truncated senses (`sen`), which carry labels but no defining text
  dt?: MWDefiningText[];
  sdsense?: {
    sd?: string;
    dt?: MWDefiningText[];
  };
}

export type MWSenseSequence = Array<MWSenseItem[]>;

export interface MWDefinition {
  sseq: MWSenseSequence;
}

export interface MWEntry {
  meta: MWMeta;
  hwi?: MWHeadwordInfo;
  fl?: string;
  def?: MWDefinition[];
  // Present only when the entry has definitions to abridge
  shortdef?: string[];
  et?: Array<['text', string] | ['et_snote', unknown]>;
}

export interface MWConfig {
  BASE_URL: string;
  DICTIONARY: string;
  DEFAULT_LIMIT: number;
}
