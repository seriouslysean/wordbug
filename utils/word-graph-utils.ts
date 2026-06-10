import type { WordData } from '#types';

import { corpusRelationMatch } from '#utils/word-data-utils';

export interface GraphNode {
  word: string;
  x: number;
  y: number;
}

export interface GraphEdge {
  from: number;
  to: number;
}

export interface WordGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  size: number;
}

interface BuildOptions {
  size?: number;
}

/** Inset (px) from the viewBox edge, leaving room for node labels. */
const LAYOUT_PADDING = 70;

interface Adjacency {
  /** Lowercase word -> set of lowercase connected words (connected words only). */
  adjacency: Map<string, Set<string>>;
  /** Lowercase word -> original display casing. */
  display: Map<string, string>;
}

/**
 * Builds the undirected corpus adjacency the graph is laid out from: an edge
 * joins two words when one lists the other (synonym or related term) AND that
 * term resolves to a corpus headword via {@link corpusRelationMatch} (exact or
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
 * Lays the corpus adjacency out as a node-link graph: words on a circle (sorted
 * by word) with one edge per relationship. The deterministic layout keeps the SVG
 * stable across builds with no physics simulation or dependencies. Empty graph
 * when there are no in-corpus relationships, so the caller can self-hide.
 */
export const buildWordGraph = (words: WordData[], options: BuildOptions = {}): WordGraph => {
  const size = options.size ?? 600;
  const radius = size / 2 - LAYOUT_PADDING;
  const center = size / 2;

  const { adjacency, display } = buildAdjacency(words);

  const connectedWords = [...adjacency.keys()].toSorted();
  const indexOf = new Map(connectedWords.map((word, index) => [word, index]));
  const count = connectedWords.length;

  const nodes: GraphNode[] = connectedWords.map((word, index) => {
    const angle = (2 * Math.PI * index) / count - Math.PI / 2;
    return {
      word: display.get(word) ?? word,
      x: Math.round((center + radius * Math.cos(angle)) * 100) / 100,
      y: Math.round((center + radius * Math.sin(angle)) * 100) / 100,
    };
  });

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

  return { nodes, edges, size };
};
