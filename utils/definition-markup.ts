// An HTML-style tag: `<`, an optional `/`, a name that starts with a letter,
// then anything but angle brackets up to `>`. A `<` without a name after it,
// as in "a < b" or "(<20 mg/dL)", is text.
export const DEFINITION_TAG_SOURCE = String.raw`<(\/?)([A-Za-z][\w-]*)((?![\w-])[^<>]*)>`;

const TAG_LIKE_START = /<\/?[A-Za-z][\w-]*(?=\s|\/|$)/;
const INTERNAL_XREF_TARGET = /\burlencoded\s*=\s*(["'])(.*?)\1/i;
const URL_PATH_SEGMENT = /^(?:[\w.~-]|%[\dA-Fa-f]{2})+$/;

/** True when text contains a complete HTML-shaped tag. */
export const hasMarkup = (text: string): boolean => new RegExp(DEFINITION_TAG_SOURCE).test(text);

const hasMalformedTagStart = (text: string): boolean => TAG_LIKE_START.test(text);

/**
 * Refuses legacy definition markup whose structure the normalizer could only
 * interpret by guessing. Unknown but balanced formatting tags are valid: the
 * normalizer flattens them to their text.
 */
export function assertWellFormedDefinitionMarkup(markup: string): void {
  const tags = new RegExp(DEFINITION_TAG_SOURCE, 'g');
  const stack: string[] = [];
  let cursor = 0;

  for (const match of markup.matchAll(tags)) {
    const [tag, closing, rawName = '', attributes = ''] = match;
    if (hasMalformedTagStart(markup.slice(cursor, match.index))) {
      throw new Error('Malformed definition markup');
    }
    cursor = match.index + tag.length;
    const name = rawName.toLowerCase();
    const trimmedAttributes = attributes.trim();

    if (closing) {
      if (trimmedAttributes || stack.at(-1) !== name) {
        throw new Error('Malformed definition markup');
      }
      stack.pop();
      continue;
    }

    const selfClosing = trimmedAttributes.endsWith('/');
    if (selfClosing && (name === 'xref' || name === 'internalxref')) {
      throw new Error('Malformed definition markup');
    }
    if (name === 'internalxref') {
      const target = INTERNAL_XREF_TARGET.exec(attributes)?.[2];
      if (!target || !URL_PATH_SEGMENT.test(target)) {
        throw new Error('Malformed definition markup');
      }
    }
    if ((name === 'xref' || name === 'internalxref')
      && stack.some(open => open === 'xref' || open === 'internalxref')) {
      throw new Error('Malformed definition markup');
    }
    if (!selfClosing) {
      stack.push(name);
    }
  }

  if (stack.length > 0 || hasMalformedTagStart(markup.slice(cursor))) {
    throw new Error('Malformed definition markup');
  }
}
