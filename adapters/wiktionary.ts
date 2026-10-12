import { decodeHTML } from 'entities';

import type {
  DictionaryAdapter,
  DictionaryResponse,
  WiktionaryDefinition,
  WiktionaryUsage,
} from '#types';
import type { BasePartOfSpeech } from '#constants/parts-of-speech';
import {
  adapterFetch,
  buildDefinition,
  buildDictionaryResponse,
  parseJsonResponse,
  throwOnHttpError,
  throwUnexpectedShape,
  throwWordNotFound,
} from '#utils/adapter-utils';
import { isOptional, isRecord, isString, isStringArray } from '#utils/type-guards';

// Wikimedia's own definition endpoint for English Wiktionary. Overridable as
// MERRIAM_WEBSTER_API_URL is, so a test can answer for it.
const DEFAULT_API_URL = 'https://en.wiktionary.org/api/rest_v1';
const PAGE_URL = 'https://en.wiktionary.org/wiki';

// The endpoint keys its answer by language code. Under "en" it sends the
// page's English section and, before it, its Translingual one: terms used
// across languages, such as a taxonomic name or a code word. Each usage
// names its section in `language`.
const ENGLISH_KEY = 'en';
const ENGLISH = 'English';

/**
 * Wikimedia asks every client for a User-Agent that names it and gives a way
 * to reach its operator: "Set a unique `User-Agent` or `Api-User-Agent`
 * header that allows us to contact you quickly. Email addresses or URLs of
 * contact pages work well." (https://en.wiktionary.org/api/rest_v1/, Global
 * Rules). The repository URL is that contact; a generic agent may be blocked
 * (https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy).
 */
const USER_AGENT = 'occasional-wotd (https://github.com/seriouslysean/occasional-wotd)';

/**
 * What a page shows beside a definition from here. Wiktionary's text is
 * CC BY-SA 4.0, which asks a reuser to credit it, name the licence and
 * "indicate if You modified the Licensed Material" (section 3(a)(1),
 * https://creativecommons.org/licenses/by-sa/4.0/legalcode.en): this text is
 * modified, its markup and links removed, hence "Adapted". The link to the
 * material that the licence also asks for is the definition's sourceUrl.
 */
const ATTRIBUTION = 'Adapted from Wiktionary (CC BY-SA 4.0)';

/**
 * Maps Wiktionary's part-of-speech headings to elementary types. Most are
 * already vocabulary values once lowercased ("Noun"); any other heading
 * ("Phrase", "Numeral", "Suffix") is kept as the definition's `label`.
 */
const POS_MAP = {
  'proper noun': 'noun',
} satisfies Readonly<Record<string, BasePartOfSpeech>>;

const isDefinition = (value: unknown): value is WiktionaryDefinition =>
  isRecord(value)
  && isString(value.definition)
  && isOptional(value.examples, isStringArray);

const isUsage = (value: unknown): value is WiktionaryUsage =>
  isRecord(value)
  && isString(value.partOfSpeech)
  && isString(value.language)
  && Array.isArray(value.definitions) && value.definitions.every(isDefinition);

/**
 * Checks every field fetchWordData reads from the usages, down to
 * each definition, so a malformed one is refused before the transform runs.
 */
export const isWiktionaryUsages = (value: unknown): value is WiktionaryUsage[] =>
  Array.isArray(value) && value.every(isUsage);

// What is in the HTML and no part of its text: a comment, and a script or a
// stylesheet with its content ("antidisestablishmentarianism" carries a
// template's stylesheet). A comment goes whole, so a `>` inside it ends nothing.
const HIDDEN = /<!--.*?-->|<(script|style)\b[^>]*>.*?<\/\1\s*>/gis;

// Tags that end a line or a block: the words on either side are separate
const BREAKS = /<\/?(?:br|p|div|li|ol|ul|dl|dt|dd|table|tr|td|th|blockquote|h[1-6]|hr)\b[^>]*>/gi;

const TAGS = /<[^>]*>/g;

// Marks that set the direction of the text around them and show as nothing
const DIRECTIONAL_MARKS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

const withoutHidden = (html: string): string => html.replaceAll(HIDDEN, '');

/**
 * Reads the endpoint's HTML as plain text. Comments, scripts and stylesheets
 * go with their content; a tag that breaks a line or closes a block becomes a
 * space, so "a<br>b" is two words; every other tag is dropped and its content
 * kept. Links to other entries go with the rest of the markup, as the
 * Merriam-Webster adapter drops its cross-references: Wiktionary links nearly
 * every content word of a definition. Only then are character references
 * decoded, so text is never read as markup: a literal `<` is always written
 * `&lt;` in HTML, every raw one opens a tag, and what `&lt;b&gt;` decodes to
 * is the reader's "<b>", not a tag to drop. Directional marks are removed and
 * runs of whitespace become single spaces.
 */
export const htmlToText = (html: string): string =>
  decodeHTML(withoutHidden(html).replaceAll(BREAKS, ' ').replaceAll(TAGS, ''))
    .replaceAll(DIRECTIONAL_MARKS, '')
    .replaceAll(/\s+/g, ' ')
    .trim();

// Where a sense's subsenses begin: the ordered list nested in its HTML
const SUBSENSES = /<ol\b/i;

/**
 * A sense's own HTML, without its subsenses. The endpoint sends a sense that
 * has subsenses twice over: its text is followed by a nested `<ol>` holding
 * every subsense, and each subsense then comes again as a definition of its
 * own. "water" has "A combination of water and other substance(s)." with
 * "Mineral water." nested in it and again as the next item; "Paris" has "A
 * locale in the United States." with twenty-five places nested and then
 * listed. So the sense's own text ends where the list opens. The list is cut
 * to the end rather than to its closing tag, which the endpoint leaves out.
 * The subsenses stay as the definitions the endpoint makes of them: each is a
 * sense of the word, often the specific one a reader is after, and dropping
 * them would leave "water" without mineral water and "Paris" without Texas.
 */
const ownSenseHtml = (html: string): string => {
  const shown = withoutHidden(html);
  return shown.slice(0, SUBSENSES.exec(shown)?.index);
};

/**
 * Wiktionary's note that an entry is a translation hub: a term kept mainly so
 * that other languages' words have an English entry to be translations of
 * (https://en.wiktionary.org/wiki/Appendix:Glossary#translation_hub). It is
 * about the page and says nothing of the word, yet the endpoint sends it
 * inside the sense: "apple juice" read "The juice of apples. (This entry is
 * a translation hub.)". The note is the span that links that glossary entry
 * and holds no span of its own. It is found by the link and not by its class,
 * `use-with-mention`, which a sense can carry whole: "older brother" is "Used
 * other than figuratively or idiomatically: see older, brother." in a span of
 * that class, followed by the note in another.
 */
const TRANSLATION_HUB_NOTE = /<span\b[^>]*>(?:(?!<\/?span\b).)*?Appendix:Glossary#translation_hub(?:(?!<\/?span\b).)*?<\/span>/gis;

/** A sense's own HTML, without its subsenses and without that note. */
const senseHtml = (html: string): string => ownSenseHtml(html).replaceAll(TRANSLATION_HUB_NOTE, '');

/**
 * True for an item that is the note and nothing else, as the only item of
 * "bake bread" is: the page lists the term and defines nothing there. It goes
 * the way of a footnote, so a page with no other sense answers with no
 * definitions and reads as not found. Left in with its text removed, it
 * would be a blank definition, and a page of those reads as a changed API.
 */
const isHubNoteOnly = (html: string): boolean => {
  const own = ownSenseHtml(html);
  const rest = senseHtml(html);
  return rest !== own && htmlToText(rest) === '';
};

/**
 * True for an item that is a footnote of the page and no sense of the word.
 * The endpoint lists every numbered item under a part of speech, and a
 * footnote list is one: "pneumonoultramicroscopicsilicovolcanoconiosis"
 * comes back with a note on its pronunciation as its second definition.
 * MediaWiki's Cite extension marks the text of every footnote with this class.
 */
const isFootnote = (html: string): boolean => html.includes('mw-reference-text');

/**
 * The entry's page on Wiktionary, whose history lists its authors. A title
 * is written with underscores for spaces.
 */
const getPageUrl = (word: string): string => `${PAGE_URL}/${encodeURIComponent(word.replaceAll(' ', '_'))}`;

export const wiktionaryAdapter: DictionaryAdapter = {
  name: 'wiktionary',

  async fetchWordData(word: string): Promise<DictionaryResponse> {
    const baseUrl = process.env.WIKTIONARY_API_URL || DEFAULT_API_URL;
    const url = `${baseUrl}/page/definition/${encodeURIComponent(word)}`;
    const response = await adapterFetch(url, 'Wiktionary', { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT });
    throwOnHttpError(response, word, 'Wiktionary');

    const data = await parseJsonResponse(response, 'Wiktionary');

    // Usages come keyed by language: anything else means the API changed,
    // which is a fault to report, not a misspelling
    if (!isRecord(data)) {
      throwUnexpectedShape('Wiktionary', word);
    }
    // A page with entries in other languages only has no English word on it
    const sent = data[ENGLISH_KEY];
    if (sent === undefined) {
      throwWordNotFound(word);
    }
    if (!isWiktionaryUsages(sent)) {
      throwUnexpectedShape('Wiktionary', word);
    }
    // The English section is the word. The Translingual one comes first and
    // would otherwise supply the primary definition: of "three" a NATO code
    // word, of "set" a language code, of "Paris" a genus of plants. It is read
    // only when the page has no English section, as for "Amblypygi", a
    // taxonomic name, whose only definition it holds.
    const english = sent.filter(usage => usage.language === ENGLISH);
    const usages = english.length > 0 ? english : sent;
    const sourceUrl = getPageUrl(word);

    // No `id`: the endpoint answers for one page, and names no other entry
    const definitions = usages.flatMap(usage =>
      usage.definitions.filter(def => !isFootnote(def.definition) && !isHubNoteOnly(def.definition)).map(def => buildDefinition({
        partOfSpeech: usage.partOfSpeech,
        text: htmlToText(senseHtml(def.definition)),
        attributionText: ATTRIBUTION,
        sourceDictionary: 'wiktionary',
        sourceUrl,
        // A sense with subsenses is sent with their examples, and those of
        // senses after them, mixed into its own: none can be called its own
        examples: SUBSENSES.test(def.definition) ? undefined : def.examples?.map(htmlToText),
      }, POS_MAP)));

    return buildDictionaryResponse(word, definitions, 'Wiktionary', ATTRIBUTION, sourceUrl);
  },
};
