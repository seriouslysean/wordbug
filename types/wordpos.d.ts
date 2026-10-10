// Minimal ambient types for the untyped `wordpos` package (only the surface the
// WordNet relations adapter uses). wordpos resolves the bundled wordnet-db path
// itself, so no options are needed.
declare module 'wordpos' {
  interface WordNetPointer {
    pointerSymbol: string;
    synsetOffset: string;
    pos: string;
    sourceTarget: string;
  }

  interface WordNetSynset {
    synsetOffset: string;
    pos: string;
    lemma: string;
    synonyms: string[];
    ptrs: WordNetPointer[];
    gloss: string;
    def: string;
  }

  interface WordPOSOptions {
    dictPath?: string;
  }

  class WordPOS {
    constructor(options?: WordPOSOptions);
    lookup(word: string): Promise<WordNetSynset[]>;
    seek(synsetOffset: string, pos: string): Promise<WordNetSynset>;
  }

  export = WordPOS;
}
