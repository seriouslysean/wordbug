import { wordnikAdapter } from '~adapters/wordnik';
import type { DictionaryAdapter } from '~types/adapters';
import { logger } from '~astro-utils/logger';

/**
 * Gets the configured dictionary adapter based on DICTIONARY_ADAPTER environment variable
 * @returns The configured adapter implementation
 * @throws {Error} When adapter name is not supported
 */
export function getAdapter(): DictionaryAdapter {
  const adapterName = process.env.DICTIONARY_ADAPTER || 'wordnik';
  logger.info('Using dictionary adapter', { adapter: adapterName });
  switch (adapterName.toLowerCase()) {
    case 'wordnik':
      return wordnikAdapter;
    default:
      throw new Error('Unsupported dictionary adapter');
  }
}

