import { getAdapter } from '~adapters/factory';
import type { WordData } from '~types/word';
import type { WordnikDefinition } from '~types/wordnik';
import { logger } from '~utils-client/logger';

/**
 * Universal wrapper for fetching word data from any dictionary API
 * Uses the configured adapter from environment
 */
export const getWordData = async (
  word: string,
  options: Record<string, unknown> = {},
): Promise<WordnikDefinition[]> => {
  try {
    logger.info('Fetching word data', { word, adapter: process.env.DICTIONARY_ADAPTER || 'wordnik' });
    const adapter = getAdapter();
    const response = await adapter.fetchWordData(word, options);
    const data = response.definitions;
    // Data validation happens in the adapter's fetchWordData method
    // If we get here, the data is already validated
    return data;
  } catch (error) {
    logger.error('Failed to fetch word data', { word, error: (error as Error).message });
    throw error;
  }
};

/**
 * Fetch word data and transform to internal WordData format
 */
export const getWordDataForDate = async (
  word: string,
  date: string,
  options: Record<string, unknown> = {},
): Promise<WordData> => {
  try {
    const adapter = getAdapter();
    const response = await adapter.fetchWordData(word, options);
    return adapter.transformToWordData(response, date);
  } catch (error) {
    logger.error('Failed to fetch and transform word data', { word, date, error: (error as Error).message });
    throw error;
  }
};
