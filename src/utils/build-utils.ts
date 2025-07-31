import type { WordData } from '~types/word';

import { generateWordDataHash } from './word-data-utils';

export interface BuildData {
  version: string;
  release: string;
  timestamp: string;
  wordsCount: number;
  wordsHash: string;
}

/**
 * Gets build-time data that was injected at build time
 * All values are compile-time constants from Vite's define
 * @param {WordData[]} [words=allWords] - Array of word data to use for stats
 * @returns {Object} Build data for browser exposure
 */
export function getBuildData(words: WordData[]): BuildData {
  return {
    version: __VERSION__,
    release: __RELEASE__,
    timestamp: __TIMESTAMP__,
    wordsCount: words.length,
    wordsHash: generateWordDataHash(words.map(w => w.word)),
  };
}

