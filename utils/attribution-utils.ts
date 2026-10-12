import type { SourceMeta, WordData } from '#types';

/**
 * A licence a dictionary's text is reused under, as a page names and links it.
 */
export interface SourceLicense {
  name: string;
  url: string;
}

/**
 * The licence of Wiktionary's text: "The original texts of Wiktionary entries
 * are dual-licensed to the public under both the Creative Commons
 * Attribution-ShareAlike 4.0 International License (CC-BY-SA) and the GNU
 * Free Documentation License" (https://en.wiktionary.org/wiki/Wiktionary:Copyrights),
 * and "Reusers may comply with either license or both"
 * (https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use, section 7).
 */
export const WIKTIONARY_LICENSE: SourceLicense = {
  name: 'Creative Commons Attribution-ShareAlike 4.0 International License',
  url: 'https://creativecommons.org/licenses/by-sa/4.0/',
};

// The value stored as a definition's `sourceDictionary` for Wiktionary's text,
// whichever adapter fetched it
const WIKTIONARY_SOURCE = 'wiktionary';

/**
 * Merriam-Webster's own titles for its API products, by the name the API
 * knows each reference by (MERRIAM_WEBSTER_DICTIONARY, stored as a
 * definition's `sourceDictionary`). Its brand guidelines ask that "product
 * titles should be written out in full" and refer to its product list "for a
 * API's full and proper title" (https://dictionaryapi.com/info/branding-guidelines);
 * these are copied from that list (https://dictionaryapi.com/products/index).
 */
const MERRIAM_WEBSTER_TITLES: Readonly<Record<string, string>> = {
  collegiate: "Merriam-Webster's Collegiate® Dictionary with Audio",
  thesaurus: "Merriam-Webster's Collegiate® Thesaurus",
  spanish: "Merriam-Webster's Spanish-English Dictionary with Audio",
  medical: "Merriam-Webster's Medical Dictionary with Audio",
  learners: "Merriam-Webster's Learner's Dictionary with Audio",
  sd2: "Merriam-Webster's Elementary Dictionary with Audio (Grades 3-5)",
  sd3: "Merriam-Webster's Intermediate Dictionary with Audio (Grades 6-8)",
  ithesaurus: "Merriam-Webster's Intermediate Thesaurus (Grades 6-8)",
  sd4: "Merriam-Webster's School Dictionary with Audio (Grades 9-11)",
};

/**
 * A dictionary a site owes credit to, because a stored word came from it.
 * Merriam-Webster carries the titles of the reference works used; one whose
 * stored name is not in its product list has no title to give.
 */
export type DictionaryCredit =
  | { type: 'merriam-webster'; titles: string[] }
  | { type: 'wiktionary' }
  | { type: 'wordnik' };

const isFromWiktionary = (word: WordData): boolean =>
  word.adapter === WIKTIONARY_SOURCE || word.data.some(definition => definition.sourceDictionary === WIKTIONARY_SOURCE);

/**
 * The dictionaries that supplied the stored words, and only those, read from
 * the records alone: a word's `adapter` names the dictionary that answered,
 * and a definition's `sourceDictionary` the work the text is from. A word
 * written by hand (`adapter: "manual"`) owes nothing, and neither does an
 * adapter name this does not know. Wiktionary is credited for its text
 * wherever it was fetched from. Wordnik is credited while a site still holds
 * a word it supplied; no adapter fetches from it any more, so that ends when
 * the site re-sources those words.
 */
export const getDictionaryCredits = (words: readonly WordData[]): DictionaryCredit[] => {
  const merriamWebster = words.filter(word => word.adapter === 'merriam-webster');
  const stored = new Set(merriamWebster.flatMap(word => word.data.map(definition => definition.sourceDictionary)));
  const titles = Object.entries(MERRIAM_WEBSTER_TITLES).flatMap(([name, title]) => (stored.has(name) ? [title] : []));

  const candidates: Array<[owed: boolean, credit: DictionaryCredit]> = [
    [merriamWebster.length > 0, { type: 'merriam-webster', titles }],
    [words.some(isFromWiktionary), { type: 'wiktionary' }],
    [words.some(word => word.adapter === 'wordnik'), { type: 'wordnik' }],
  ];
  return candidates.flatMap(([owed, credit]) => (owed ? [credit] : []));
};

/**
 * The licence a definition's page must name beside it, or null when its
 * source asks for no credit on the page itself. Wiktionary's does: "For each
 * copy or modified version that you distribute, you agree to include a
 * licensing notice stating which license the work is released under, along
 * with either a hyperlink or URL to the text of the license"
 * (https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use, section 7).
 * Merriam-Webster asks for its logo on the application, not for a credit on
 * each entry.
 */
export const getDefinitionLicense = (meta: SourceMeta | null | undefined): SourceLicense | null =>
  (meta?.sourceDictionary === WIKTIONARY_SOURCE ? WIKTIONARY_LICENSE : null);
