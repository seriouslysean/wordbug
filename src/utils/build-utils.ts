import { generateWordDataHash,getAllWords } from './word-utils';

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
 * @returns {Object} Build data for browser exposure
 */
export function getBuildData(): BuildData {
  const words = getAllWords();
  return {
    version: __VERSION__,
    release: __RELEASE__,
    timestamp: __TIMESTAMP__,
    wordsCount: words.length,
    wordsHash: generateWordDataHash(words.map(w => w.word)),
  };
}

