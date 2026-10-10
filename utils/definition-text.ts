import { decodeHTML } from 'entities';

import type { DefinitionSegment, DictionaryReference } from '#types';
import { DEFAULT_WORDNIK_WEBSITE_URL } from '#constants/defaults';
import { DEFINITION_TAG_SOURCE } from '#utils/definition-markup';
import { areValidReferences } from '#utils/reference-utils';

export { hasMarkup } from '#utils/definition-markup';

/**
 * A definition's text read out of markup: plain text, and each
 * cross-reference in it as a range of that text.
 */
export interface DefinitionText {
  text: string;
  references: DictionaryReference[];
}

const TAGS = new RegExp(DEFINITION_TAG_SOURCE, 'g');

// Wordnik's <internalXref> names its target already URL-encoded
const INTERNAL_XREF_TARGET = /\burlencoded\s*=\s*(["'])(.*?)\1/i;
const URL_PATH_SEGMENT = /^(?:[\w.~-]|%[\dA-Fa-f]{2})+$/;

// Read at call time rather than import time so the build, the CLI and tests
// each see their own environment. Defaults like MERRIAM_WEBSTER_API_URL: the
// Add Word workflow does not set it, and a fetched cross-reference needs it.
const wordnikWordsUrl = (path: string): string =>
  `${process.env.WORDNIK_WEBSITE_URL || DEFAULT_WORDNIK_WEBSITE_URL}/words/${path}`;

/**
 * The Wordnik page for a word, lowercased as Wordnik's own word URLs are.
 */
const generateWordnikWordUrl = (word: string): string => wordnikWordsUrl(encodeURIComponent(word.toLowerCase()));

// A cross-reference opened and not yet closed. An <xref> links the word it
// wraps, so its URL waits for the closing tag; an <internalXref> names its
// target when it opens.
type OpenReference =
  | { type: 'xref'; start: number }
  | { type: 'internalxref'; start: number; url: string };

const openReference = (name: string, attributes: string, start: number): OpenReference | null => {
  if (name === 'xref') {
    return { type: 'xref', start };
  }
  const target = INTERNAL_XREF_TARGET.exec(attributes)?.[2];
  if (name === 'internalxref' && target && URL_PATH_SEGMENT.test(target)) {
    return { type: 'internalxref', start, url: wordnikWordsUrl(target) };
  }
  return null;
};

/**
 * The reference an open tag makes now that it has closed on the text read so
 * far: the wrapped text less its outer whitespace, or none when that is blank.
 */
const closeReference = (open: OpenReference, text: string): DictionaryReference | null => {
  const wrapped = text.slice(open.start);
  const start = open.start + wrapped.length - wrapped.trimStart().length;
  const end = text.length - (wrapped.length - wrapped.trimEnd().length);
  if (start >= end) {
    return null;
  }
  const url = open.type === 'xref' ? generateWordnikWordUrl(text.slice(start, end)) : open.url;
  return { start, end, url };
};

/**
 * Reads Wordnik's definition markup as plain text and cross-references.
 * `<xref>word</xref>` links the Wordnik page for the word it wraps, and
 * `<internalXref urlencoded="target">label</internalXref>` the page it names.
 * Any other tag is dropped and its content kept as text. Character references
 * (`&lt;`, `&amp;`) are decoded, as a browser would, so the result can contain
 * angle brackets or tag-shaped text; callers render every text run escaped.
 * Cross-references do not nest: a new one opening abandons the one still open,
 * whose text stays plain; a closing tag that matches nothing open is dropped,
 * and so is a reference never closed.
 *
 * The one parser of this markup: the Wordnik adapter translates fetched text
 * with it, and the offline normalizer translates legacy stored text.
 */
export function parseDefinitionMarkup(markup: string): DefinitionText {
  const references: DictionaryReference[] = [];
  let text = '';
  let cursor = 0;
  let open: OpenReference | null = null;

  for (const match of markup.matchAll(TAGS)) {
    const [tag, closing, name = '', attributes = ''] = match;
    text += decodeHTML(markup.slice(cursor, match.index));
    cursor = match.index + tag.length;
    const tagName = name.toLowerCase();

    if (!closing) {
      open = openReference(tagName, attributes, text.length) ?? open;
    } else if (open?.type === tagName) {
      const reference = closeReference(open, text);
      if (reference) {
        references.push(reference);
      }
      open = null;
    }
  }

  return { text: text + decodeHTML(markup.slice(cursor)), references };
}

/**
 * A definition as a page shows it: runs of plain text and cross-references,
 * without the whitespace around the whole. Stored definitions are canonical,
 * so their text is already plain and their links are explicit ranges.
 *
 * Throws when the references do not fit the text: a record that cannot be
 * shown as it was written.
 */
export function toDefinitionSegments(definition: { text: string; references?: DictionaryReference[] }): DefinitionSegment[] {
  const { text, references = [] } = definition;
  if (!areValidReferences(text, references)) {
    throw new Error(`Cross-references do not fit the definition "${text}"`);
  }

  const start = text.length - text.trimStart().length;
  const end = text.trimEnd().length;
  // A reference covers nonblank text, so trimming the ends leaves it nonempty
  const ranges = references.map(reference => ({
    ...reference,
    start: Math.max(reference.start, start),
    end: Math.min(reference.end, end),
  }));
  const plain = (from: number, to: number): DefinitionSegment[] =>
    (from < to ? [{ type: 'text', text: text.slice(from, to) }] : []);

  return [
    ...ranges.flatMap((range, index): DefinitionSegment[] => [
      ...plain(ranges[index - 1]?.end ?? start, range.start),
      { type: 'reference', text: text.slice(range.start, range.end), url: range.url },
    ]),
    ...plain(ranges.at(-1)?.end ?? start, end),
  ];
}
