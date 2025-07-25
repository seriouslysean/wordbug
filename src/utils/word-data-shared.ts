import path from 'path';
import type { WordData } from '~types/word';
import { logger } from '~utils/logger';

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
 * Cache provider function type for dependency injection
 */
export type CacheProvider = {
  get: (key: string) => WordData[] | undefined;
  set: (key: string, data: WordData[]) => void;
  has: (key: string) => boolean;
};

/**
 * Core word data processing logic shared between environments
 * Accepts dependency injection for file loading and caching
 */
export const createWordDataProvider = (
  fileLoader: WordFileLoader,
  cache?: CacheProvider,
  cacheKey = 'words'
) => {
  return (): WordData[] => {
    // Check cache first if available
    if (cache?.has(cacheKey)) {
      return cache.get(cacheKey)!;
    }

    try {
      // Load files using injected loader
      const files = fileLoader();

      if (files.length === 0) {
        logger.error('No word files found');
        const emptyWords: WordData[] = [];
        if (cache) cache.set(cacheKey, emptyWords);
        return emptyWords;
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
              error: (error as Error).message 
            });
            return null;
          }
        })
        .filter((item): item is WordData => item !== null)
        .sort((a, b) => b.date.localeCompare(a.date));

      logger.info('Loaded word files successfully', { count: words.length });

      // Cache result if cache is available
      if (cache) cache.set(cacheKey, words);
      return words;

    } catch (error) {
      logger.error('Failed to load word data', { error: (error as Error).message });
      const emptyWords: WordData[] = [];
      if (cache) cache.set(cacheKey, emptyWords);
      return emptyWords;
    }
  };
};

/**
 * Utility function to create a simple in-memory cache provider
 */
export const createMemoryCache = (): CacheProvider => {
  const cache = new Map<string, WordData[]>();
  
  return {
    get: (key: string) => cache.get(key),
    set: (key: string, data: WordData[]) => cache.set(key, data),
    has: (key: string) => cache.has(key),
  };
};