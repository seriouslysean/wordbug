import subtlexData from 'subtlex-word-frequencies';

import type { FrequencyResult } from '#types';

/**
 * Frequency map keyed by lowercased word, built once at module load. Counts for
 * case variants (e.g. "What"/"what") are summed so lookups are case-insensitive
 * and comparable to the published Zipf scale.
 */
const frequencyMap: Map<string, number> = (() => {
  const map = new Map<string, number>();
  for (const entry of subtlexData) {
    const key = entry.word.toLowerCase();
    map.set(key, (map.get(key) ?? 0) + entry.count);
  }
  return map;
})();

/** Total token count across the corpus, used to derive Zipf scores. */
const totalCount: number = (() => {
  let sum = 0;
  for (const count of frequencyMap.values()) {
    sum += count;
  }
  return sum;
})();

/**
 * Maps a Zipf score to a commonness band. Cut points follow the canonical
 * low/high-frequency split at Zipf 3.0.
 */
const bandForZipf = (zipf: number): FrequencyResult['band'] => {
  if (zipf >= 4) {
    return 'common';
  }
  if (zipf >= 3) {
    return 'uncommon';
  }
  if (zipf >= 2) {
    return 'rare';
  }
  return 'very-rare';
};

/**
 * Raw occurrence count for a word, or null when it is not in the corpus.
 */
export const getWordFrequency = (word: string): number | null => {
  if (!word) {
    return null;
  }
  return frequencyMap.get(word.toLowerCase()) ?? null;
};

/**
 * Classifies a word's commonness on the Zipf scale (log10 occurrences per
 * billion words). Words absent from the corpus fall into the rarest band, since
 * SUBTLEX covers common usage and absence is itself a rarity signal.
 *
 * Band cut points follow the canonical low/high-frequency split at Zipf 3.0:
 *   common >= 4, uncommon 3-4, rare 2-3, very-rare < 2 (or out of dataset).
 */
export const getFrequencyBand = (word: string): FrequencyResult => {
  const count = getWordFrequency(word);
  if (count === null) {
    return { band: 'very-rare', zipf: null, count: null, inDataset: false };
  }

  const zipf = Math.round(Math.log10((count / totalCount) * 1e9) * 100) / 100;
  return { band: bandForZipf(zipf), zipf, count, inDataset: true };
};
