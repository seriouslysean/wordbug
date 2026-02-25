/**
 * Merriam-Webster Collegiate Dictionary API types
 * Only fields we access are typed; the full response is preserved in rawData.
 */

export interface MWMeta {
  id: string;
  uuid: string;
  src: string;
  section: string;
  stems: string[];
  offensive: boolean;
}

export interface MWHeadwordInfo {
  hw: string;
  prs?: Array<{
    mw?: string;
    sound?: { audio: string; ref: string; stat: string };
  }>;
}

export interface MWVisTuple {
  t: string;
  aq?: { auth?: string; source?: string };
}

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
  dt: Array<['text', string] | ['vis', MWVisTuple[]] | ['uns', Array<Array<['text', string] | ['vis', MWVisTuple[]]>>] | [string, unknown]>;
  sdsense?: {
    sd: string;
    dt: Array<['text', string] | ['vis', MWVisTuple[]] | [string, unknown]>;
  };
}

export type MWSenseSequence = Array<MWSenseItem[]>;

export interface MWDefinition {
  sseq: MWSenseSequence;
}

export interface MWEntry {
  meta: MWMeta;
  hwi: MWHeadwordInfo;
  hom?: number;
  fl?: string;
  def?: MWDefinition[];
  shortdef: string[];
  et?: Array<['text', string]>;
  date?: string;
  quotes?: Array<{
    t: string;
    aq: { auth?: string; source?: string; aqdate?: string };
  }>;
}

export interface MWConfig {
  BASE_URL: string;
  DICTIONARY: string;
  DEFAULT_LIMIT: number;
}
