import { describe, expect, it } from 'vitest';

import { buildWordGraph } from '#utils/word-graph-utils';

const word = (name, enrichment) => ({ word: name, date: '20250101', adapter: 'a', data: [], enrichment });

describe('word-graph-utils', () => {
  describe('buildWordGraph', () => {
    const words = [
      word('knowledge', { related: ['book', 'learned', 'notincorpus'] }),
      word('book'),
      word('learned', { synonyms: ['knowledge'] }),
      word('lonely'),
    ];

    it('includes only words connected to another corpus word', () => {
      const graph = buildWordGraph(words);
      expect(graph.nodes.map(node => node.word).toSorted()).toEqual(['book', 'knowledge', 'learned']);
    });

    it('builds de-duplicated undirected edges and ignores out-of-corpus terms', () => {
      const graph = buildWordGraph(words);
      // knowledge-book and knowledge-learned; learned->knowledge dedups to one edge
      expect(graph.edges).toHaveLength(2);
    });

    it('lays nodes out deterministically within the viewBox', () => {
      const graph = buildWordGraph(words, { size: 600 });
      expect(graph.size).toBe(600);
      for (const node of graph.nodes) {
        expect(node.x).toBeGreaterThanOrEqual(0);
        expect(node.x).toBeLessThanOrEqual(600);
        expect(node.y).toBeGreaterThanOrEqual(0);
        expect(node.y).toBeLessThanOrEqual(600);
      }
      // Same input -> identical layout
      expect(buildWordGraph(words, { size: 600 })).toEqual(graph);
    });

    it('returns an empty graph when there are no in-corpus relationships', () => {
      const graph = buildWordGraph([word('alone', { related: ['absent'] }), word('solo')]);
      expect(graph.nodes).toEqual([]);
      expect(graph.edges).toEqual([]);
    });

    it('connects words through derivational forms, not just exact matches', () => {
      // `joyful` is not a corpus word but resolves to `joy` via the shared matcher
      const graph = buildWordGraph([word('happy', { related: ['joyful'] }), word('joy')]);
      expect(graph.nodes.map(node => node.word).toSorted()).toEqual(['happy', 'joy']);
      expect(graph.edges).toHaveLength(1);
    });
  });
});
