import { allWords } from '#astro-utils/word-data-utils';
import { getDictionaryCredits as pure } from '#utils/attribution-utils';

/**
 * The dictionaries this site's own words came from (Astro wrapper: supplies
 * the cached collection).
 */
export const getDictionaryCredits = (words = allWords) => pure(words);
