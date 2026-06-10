import type { WordData } from '#types';

import { corpusRelationMatch } from '#utils/word-data-utils';

export interface GraphNode {
  word: string;
}

export interface GraphEdge {
  from: number;
  to: number;
}

export interface WordGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface Adjacency {
  /** Lowercase word -> set of lowercase connected words (connected words only). */
  adjacency: Map<string, Set<string>>;
  /** Lowercase word -> original display casing. */
  display: Map<string, string>;
}

/**
 * Builds the undirected corpus adjacency the graph is drawn from: an edge joins
 * two words when one lists the other (synonym or related term) AND that term
 * resolves to a corpus headword via {@link corpusRelationMatch} (exact or
 * derivational, e.g. `joyful` -> `joy`). Page relation chips share the same
 * matcher, so links stay consistent.
 *
 * Antonyms are intentionally excluded: edges represent associative closeness, and
 * an antonym is a semantic opposite, not a neighbour. Only connected words appear
 * as keys, so callers can self-hide on an empty result.
 */
const buildAdjacency = (words: WordData[]): Adjacency => {
  const display = new Map(words.map(word => [word.word.toLowerCase(), word.word]));
  const corpus = new Set(display.keys());
  const adjacency = new Map<string, Set<string>>();

  const connect = (a: string, b: string): void => {
    if (!adjacency.has(a)) {
      adjacency.set(a, new Set());
    }
    adjacency.get(a)?.add(b);
  };

  for (const word of words) {
    const source = word.word.toLowerCase();
    const terms = [...(word.enrichment?.synonyms ?? []), ...(word.enrichment?.related ?? [])];
    for (const term of terms) {
      const target = corpusRelationMatch(term, corpus);
      if (!target || target === source) {
        continue;
      }
      connect(source, target);
      connect(target, source);
    }
  }

  return { adjacency, display };
};

/**
 * Builds the corpus connections graph: nodes are words with at least one
 * in-corpus relationship, edges join related words. Positions are deliberately
 * not computed here — the /stats client script lays the graph out against the
 * live viewport so constant-size labels never collide at any width. Empty graph
 * when nothing connects, so the caller can self-hide.
 */
export const buildWordGraph = (words: WordData[]): WordGraph => {
  const { adjacency, display } = buildAdjacency(words);

  const connectedWords = [...adjacency.keys()].toSorted();
  const indexOf = new Map(connectedWords.map((word, index) => [word, index]));
  const nodes: GraphNode[] = connectedWords.map(word => ({ word: display.get(word) ?? word }));

  const seen = new Set<string>();
  const edges: GraphEdge[] = [];
  for (const [source, targets] of adjacency) {
    const from = indexOf.get(source);
    for (const target of targets) {
      const to = indexOf.get(target);
      if (from === undefined || to === undefined) {
        continue;
      }
      const key = [from, to].toSorted((a, b) => a - b).join('-');
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      edges.push({ from, to });
    }
  }

  return { nodes, edges };
};
