
import type { WordData } from '~types/word';
import { logger } from '~utils-client/logger';

/**
 * File information interface for dependency injection
 */
export interface WordFileInfo {
  filePath: string;
  date: string;
  content: string;
}

/**
 * File loader function type for dependency injection
 */
export type WordFileLoader = () => WordFileInfo[];

/**
 * Core word data processing logic shared between all environments
 * Accepts dependency injection for file loading
 */
export const processWordFiles = (fileLoader: WordFileLoader): WordData[] => {
  try {
    // Load files using injected loader
    const files = fileLoader();

    if (files.length === 0) {
      logger.error('No word files found');
      return [];
    }

    // Process files into WordData
    const words = files
      .map(file => {
        try {
          const data = JSON.parse(file.content);

          // Handle both array and single object formats
          const wordData = Array.isArray(data) ? data[0] : data;

          // Use the normalized date from the loader
          return { ...wordData, date: file.date };
        } catch (error) {
          logger.error('Failed to parse word file', {
            path: file.filePath,
            error: (error as Error).message,
          });
          return null;
        }
      })
      .filter((item): item is WordData => item !== null);

    // Ensure consistent sorting - newest first by date
    words.sort((a, b) => b.date.localeCompare(a.date));

    logger.info('Loaded word files successfully', { count: words.length });
    return words;
  } catch (error) {
    logger.error('Failed to load word data', { error: (error as Error).message });
    return [];
  }
};