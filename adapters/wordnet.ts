import WordPOS from 'wordpos';

/**
 * Word-level relation lists for a headword, sourced locally from WordNet.
 *
 * Replaces the former Datamuse network call: lookups run against the bundled
 * WordNet 3.1 database (no network), so enrichment is deterministic and fully
 * offline. Datamuse's own synonym/antonym relations were WordNet-backed, so this
 * goes straight to the source. WordNet is the only one of the candidate datasets
 * that carries real antonyms.
 *
 * Attribution lives in CREDITS.md (WordNet license requires preserving the
 * Princeton notice on all copies; no runtime/UI attribution is required).
 */
export interface WordRelations {
  synonyms: string[];
  antonyms: string[];
  related: string[];
}

// Per-list cap; matches the previous Datamuse cap so stored data stays bounded.
const MAX_RELATIONS = 20;

// WordNet orders senses by frequency; using only the dominant senses keeps a
// polysemous headword from importing every unrelated meaning's words (e.g.
// "memory" the faculty vs. computer memory, "music" the art vs. "face the music").
const MAX_SENSES = 2;

// WordNet pointer symbols.
const ANTONYM = '!';
// Similar-to clusters adjective satellites around a head adjective; for display
// these read as synonyms (e.g. happy -> cheerful, glad, elated).
const SIMILAR_TO = '&';
// also-see, hypernym, hyponym, derivationally-related, attribute.
const RELATED_POINTERS = new Set(['^', '@', '~', '+', '=']);

// Dictionary part-of-speech -> WordNet pos code. Unmapped values skip the filter.
const POS_TO_WORDNET: Record<string, string> = {
  noun: 'n',
  verb: 'v',
  adjective: 'a',
  adverb: 'r',
};

const wordpos = new WordPOS();

// WordNet joins multiword lemmas with underscores and appends syntactic-position
// markers to some adjectives (e.g. "afraid(p)", "laughing(a)"); strip both.
const clean = (lemma: string): string =>
  lemma.replace(/_/g, ' ').replace(/\([a-z]+\)$/, '').trim();

// Resolves a pointer's target synset to its first `limit` lemmas. Swallows
// lookup errors so one bad pointer never blocks the whole word.
const resolveLemmas = async (offset: string, pos: string, limit: number): Promise<string[]> => {
  try {
    const synset = await wordpos.seek(offset, pos);
    return (synset.synonyms ?? []).slice(0, limit).map(clean);
  } catch {
    return [];
  }
};

/**
 * Looks up WordNet relations for a headword, filtered to its part of speech
 * (when known) and capped to the dominant senses. Returns empty lists for words
 * not in WordNet; the caller treats relations as best-effort enrichment.
 */
export async function getWordRelations(word: string, partOfSpeech?: string): Promise<WordRelations> {
  const headword = word.toLowerCase();
  const allSenses = await wordpos.lookup(headword);

  const target = partOfSpeech ? POS_TO_WORDNET[partOfSpeech.toLowerCase()] : undefined;
  const inPos = (pos: string): boolean =>
    !target || pos === target || (target === 'a' && pos === 's');
  const senses = allSenses.filter(sense => inPos(sense.pos)).slice(0, MAX_SENSES);

  const synonyms = new Set<string>();
  const antonyms = new Set<string>();
  const related = new Set<string>();

  for (const sense of senses) {
    for (const lemma of sense.synonyms ?? []) {
      synonyms.add(clean(lemma));
    }
    for (const ptr of sense.ptrs ?? []) {
      if (ptr.pointerSymbol === ANTONYM) {
        for (const lemma of await resolveLemmas(ptr.synsetOffset, ptr.pos, 1)) {
          antonyms.add(lemma);
        }
      } else if (ptr.pointerSymbol === SIMILAR_TO) {
        for (const lemma of await resolveLemmas(ptr.synsetOffset, ptr.pos, 1)) {
          synonyms.add(lemma);
        }
      } else if (RELATED_POINTERS.has(ptr.pointerSymbol)) {
        for (const lemma of await resolveLemmas(ptr.synsetOffset, ptr.pos, 2)) {
          related.add(lemma);
        }
      }
    }
  }

  // `related` is the catch-all bucket; keep it disjoint from synonyms/antonyms
  // and the headword so the three lists never repeat a term.
  const taken = new Set<string>([headword]);
  for (const term of synonyms) {
    taken.add(term.toLowerCase());
  }
  for (const term of antonyms) {
    taken.add(term.toLowerCase());
  }

  const notHeadword = (term: string): boolean => term.toLowerCase() !== headword;
  return {
    synonyms: [...synonyms].filter(notHeadword).slice(0, MAX_RELATIONS),
    antonyms: [...antonyms].filter(notHeadword).slice(0, MAX_RELATIONS),
    related: [...related].filter(term => !taken.has(term.toLowerCase())).slice(0, MAX_RELATIONS),
  };
}
