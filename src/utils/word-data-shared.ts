import path from 'path';

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
 * Core word data processing logic shared between environments
 * Accepts dependency injection for file loading
 */
export const getAllWords = (fileLoader: WordFileLoader): WordData[] => {
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
          const fileName = path.basename(file.filePath);
          const dateFromFile = fileName.match(/(\d{8})\.json$/)?.[1];

          if (!dateFromFile) {
            logger.error('Word data file is missing date information', { path: file.filePath });
            return null;
          }

          // Handle both array and single object formats
          const wordData = Array.isArray(data) ? data[0] : data;

          // Ensure the date matches the filename
          return { ...wordData, date: file.date || dateFromFile };
        } catch (error) {
          logger.error('Failed to parse word file', {
            path: file.filePath,
            error: (error as Error).message,
          });
          return null;
        }
      })
      .filter((item): item is WordData => item !== null)
      .sort((a, b) => {
        return b.date.localeCompare(a.date);
      });

    logger.info('Loaded word files successfully', {
      count: words.length,
      isArray: Array.isArray(words),
      firstWordSample: words[0] ? { word: words[0].word, date: words[0].date } : null,
    });
    return words;
  } catch (error) {
    logger.error('Failed to load word data', { error: (error as Error).message });
    return [];
  }
};
