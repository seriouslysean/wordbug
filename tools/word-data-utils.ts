/**
 * Re-exports word data utilities for Node.js tools
 * Provides a centralized interface for word data operations in build tools
 */

// Re-export word-data utilities for Node tools
export { getAllWordFiles, getAllWords, isUsingDemoWords,updateWordFile } from '~tools/utils';
export * from '~utils/word-data-utils';

// Re-export image generation utilities from tools/utils
export { createWordSvg, generateGenericShareImage,generateShareImage } from '~tools/utils';

// Provide getWordByName for tools
import { getAllWords } from '~tools/utils';
import type { WordData } from '~types/word';

/**
 * Gets a word by its name from the word collection (case-insensitive)
 * @param word - Word to find
 * @returns Word data or null if not found
 */
export function getWordByName(word: string): WordData | null {
  const words = getAllWords();
  return words.find(w => w.word.toLowerCase() === word.toLowerCase()) || null;
}
