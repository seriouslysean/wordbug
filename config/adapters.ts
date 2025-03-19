/**
 * Dictionary adapter configuration
 */

export type DictionaryAdapter = 'wordnik' | 'other';

/**
 * Get the configured dictionary adapter
 */
export function getDictionaryAdapter(): DictionaryAdapter {
  const adapter = process.env.DICTIONARY_ADAPTER as DictionaryAdapter;
  return adapter || 'wordnik';
}

/**
 * Validate that the configured adapter is supported
 */
export function validateAdapter(): void {
  const adapter = getDictionaryAdapter();
  const supportedAdapters: DictionaryAdapter[] = ['wordnik'];

  if (!supportedAdapters.includes(adapter)) {
    throw new Error(`Unsupported dictionary adapter: ${adapter}. Supported adapters: ${supportedAdapters.join(', ')}`);
  }
}