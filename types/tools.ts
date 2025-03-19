import type { WordData } from '~types/word';

/**
 * Result returned from creating a word entry
 */
export interface CreateWordEntryResult {
  filePath: string;
  data: WordData['data'];
}