import { describe, expect, it } from 'vitest';

import { getWordRelations } from '#adapters/wordnet';

// Integration tests against the bundled WordNet 3.1 database. WordNet data is
// fixed, so these assertions are deterministic; they exercise the real lookup
// path (POS filtering, pointer classification, dedup) rather than mocking it.
describe('wordnet relations adapter', () => {
  it('returns synonyms, antonyms, and related terms for a known adjective', async () => {
    const result = await getWordRelations('happy', 'adjective');
    expect(result.antonyms).toContain('unhappy');
    expect(result.synonyms.length).toBeGreaterThan(0);
    expect(result.related.length).toBeGreaterThan(0);
  });

  it('extracts real antonyms for nouns', async () => {
    expect((await getWordRelations('joy', 'noun')).antonyms).toContain('sorrow');
    expect((await getWordRelations('love', 'noun')).antonyms).toContain('hate');
  });

  it('keeps the three lists disjoint and excludes the headword', async () => {
    const result = await getWordRelations('happy', 'adjective');
    const all = [...result.synonyms, ...result.antonyms, ...result.related].map(w => w.toLowerCase());
    expect(all).not.toContain('happy');
    expect(new Set(all).size).toBe(all.length);
  });

  it('caps each list at the maximum', async () => {
    const result = await getWordRelations('fear', 'noun');
    expect(result.synonyms.length).toBeLessThanOrEqual(20);
    expect(result.antonyms.length).toBeLessThanOrEqual(20);
    expect(result.related.length).toBeLessThanOrEqual(20);
  });

  it('part-of-speech filtering narrows a polysemous word', async () => {
    // "love" as a noun should not surface the verb sense's intimacy euphemisms.
    const noun = (await getWordRelations('love', 'noun')).related.join(' ').toLowerCase();
    expect(noun).not.toContain('sleep together');
  });

  it('strips WordNet underscores and position markers', async () => {
    const result = await getWordRelations('happy', 'adjective');
    const terms = [...result.synonyms, ...result.related].join(' ');
    expect(terms).not.toMatch(/[_()]/);
  });

  it('returns empty lists for a word not in WordNet', async () => {
    expect(await getWordRelations('zzzznotaword', 'noun')).toEqual({
      synonyms: [],
      antonyms: [],
      related: [],
    });
  });
});
