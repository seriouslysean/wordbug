import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

import {
  hasMarkup, parseDefinitionMarkup, toDefinitionSegments,
} from '#utils/definition-text';
import { areValidReferences } from '#utils/reference-utils';
import type { DefinitionSegment } from '#types';

const wordnik = (word: string): string => `https://www.wordnik.com/words/${word}`;
const textRun = (value: string): DefinitionSegment => ({ type: 'text', text: value });
const referenceRun = (value: string, url: string): DefinitionSegment => ({ type: 'reference', text: value, url });

describe('definition-text', () => {
  beforeEach(() => {
    vi.stubEnv('WORDNIK_WEBSITE_URL', undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('parseDefinitionMarkup', () => {
    it('reads each xref as a range of the plain text linking its Wordnik page', () => {
      expect(parseDefinitionMarkup('A taxonomic <xref>order</xref> within the <xref>class</xref>.')).toStrictEqual({
        text: 'A taxonomic order within the class.',
        references: [
          { start: 12, end: 17, url: wordnik('order') },
          { start: 29, end: 34, url: wordnik('class') },
        ],
      });
    });

    it('lowercases and encodes the linked word, as Wordnik word URLs are', () => {
      expect(parseDefinitionMarkup('<xref>Arachnida</xref> and <xref>naval vessel</xref>').references).toStrictEqual([
        { start: 0, end: 9, url: wordnik('arachnida') },
        { start: 14, end: 26, url: wordnik('naval%20vessel') },
      ]);
    });

    it('keeps the whitespace an xref wraps as text outside the range', () => {
      expect(parseDefinitionMarkup('a<xref> rest </xref>b')).toStrictEqual({
        text: 'a rest b',
        references: [{ start: 2, end: 6, url: wordnik('rest') }],
      });
    });

    it('ignores the attributes of an xref', () => {
      expect(parseDefinitionMarkup('<xref urlencoded="other">word</xref>').references)
        .toStrictEqual([{ start: 0, end: 4, url: wordnik('word') }]);
    });

    it('links an internalXref to the target it names, as given', () => {
      const markup = 'Also called <internalXref urlencoded="light-box">light-box</internalXref>.';

      expect(parseDefinitionMarkup(markup)).toStrictEqual({
        text: 'Also called light-box.',
        references: [{ start: 12, end: 21, url: wordnik('light-box') }],
      });
      expect(parseDefinitionMarkup("<internalXref urlencoded='Light%20Box'>it</internalXref>").references)
        .toStrictEqual([{ start: 0, end: 2, url: wordnik('Light%20Box') }]);
    });

    it.each([
      ['no target', '<internalXref>light-box</internalXref>'],
      ['a blank target', '<internalXref urlencoded="">light-box</internalXref>'],
      ['a target that is not one path segment', '<internalXref urlencoded="../../evil">light-box</internalXref>'],
      ['a target with a scheme', '<internalXref urlencoded="javascript:alert(1)">light-box</internalXref>'],
    ])('keeps the text of an internalXref with %s, unlinked', (_case, markup) => {
      expect(parseDefinitionMarkup(markup)).toStrictEqual({ text: 'light-box', references: [] });
    });

    it('uses WORDNIK_WEBSITE_URL for the links when it is set', () => {
      vi.stubEnv('WORDNIK_WEBSITE_URL', 'https://wordnik.test');

      expect(parseDefinitionMarkup('<xref>rest</xref>').references)
        .toStrictEqual([{ start: 0, end: 4, url: 'https://wordnik.test/words/rest' }]);
    });

    it('falls back to the Wordnik website when WORDNIK_WEBSITE_URL is blank', () => {
      vi.stubEnv('WORDNIK_WEBSITE_URL', '');

      expect(parseDefinitionMarkup('<xref>rest</xref>').references[0]?.url).toBe(wordnik('rest'));
    });

    it('keeps the text of formatting tags it does not know, unlinked', () => {
      expect(parseDefinitionMarkup('Opposed to <ant>disestablishmentarianism</ant>, <i>not</i> <B>this</B>.'))
        .toStrictEqual({ text: 'Opposed to disestablishmentarianism, not this.', references: [] });
    });

    it.each([
      ['a script element', 'x<script>alert(1)</script>y', 'xalert(1)y'],
      ['an image with an event handler', 'x<img src=x onerror=alert(1)>y', 'xy'],
      ['a self-closing tag', 'x<br/>y', 'xy'],
      ['an anchor', '<a href="javascript:alert(1)">click</a>', 'click'],
    ])('leaves no markup from %s', (_case, markup, text) => {
      const result = parseDefinitionMarkup(markup);

      expect(result).toStrictEqual({ text, references: [] });
      expect(hasMarkup(result.text)).toBe(false);
    });

    it('decodes character references into the characters they name', () => {
      expect(parseDefinitionMarkup('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &#39;x&#39;').text)
        .toBe("<script>alert(1)</script> & 'x'");
    });

    it('reads an encoded tag as text, never as a cross-reference', () => {
      expect(parseDefinitionMarkup('&lt;xref&gt;order&lt;/xref&gt;')).toStrictEqual({
        text: '<xref>order</xref>',
        references: [],
      });
    });

    it.each([
      ['a spaced comparison', 'a < b and c > d'],
      ['a bound', 'levels were subtherapeutic (<20 mg/dL)'],
      ['a lone bracket', '<'],
      ['an empty tag', '<>'],
      ['a tag name that starts with a digit', '<1a>'],
    ])('keeps %s as text', (_case, markup) => {
      expect(parseDefinitionMarkup(markup)).toStrictEqual({ text: markup, references: [] });
    });

    it('drops an xref that is never closed, keeping its text', () => {
      expect(parseDefinitionMarkup('a <xref>rest period')).toStrictEqual({ text: 'a rest period', references: [] });
    });

    it('drops a closing tag that matches nothing open', () => {
      expect(parseDefinitionMarkup('a rest</xref> period</internalXref>')).toStrictEqual({ text: 'a rest period', references: [] });
    });

    it('does not close an xref with a closing internalXref', () => {
      expect(parseDefinitionMarkup('<xref>rest</internalXref> period')).toStrictEqual({ text: 'rest period', references: [] });
    });

    it('lets a nested xref abandon the one it opened inside', () => {
      expect(parseDefinitionMarkup('<xref>a <xref>b</xref> c</xref>')).toStrictEqual({
        text: 'a b c',
        references: [{ start: 2, end: 3, url: wordnik('b') }],
      });
    });

    it('links an xref through formatting tags inside it', () => {
      expect(parseDefinitionMarkup('<xref><i>rest</i></xref>').references)
        .toStrictEqual([{ start: 0, end: 4, url: wordnik('rest') }]);
    });

    it('makes no reference of an xref around blank text', () => {
      expect(parseDefinitionMarkup('a<xref> </xref>b<xref></xref>')).toStrictEqual({ text: 'a b', references: [] });
    });

    it('returns plain text unchanged', () => {
      expect(parseDefinitionMarkup('The faculty of making fortunate discoveries by accident.')).toStrictEqual({
        text: 'The faculty of making fortunate discoveries by accident.',
        references: [],
      });
    });

    it('scans a long unterminated tag without quadratic backtracking', () => {
      const markup = `<${'a'.repeat(100_000)}`;
      const startedAt = performance.now();

      expect(parseDefinitionMarkup(markup)).toStrictEqual({ text: markup, references: [] });
      expect(performance.now() - startedAt).toBeLessThan(500);
    }, 20_000);
  });

  describe('hasMarkup', () => {
    it.each(['<xref>order</xref>', 'a </b> b', '<img src=x onerror=alert(1)>', '<br/>'])('finds a tag in %s', (text) => {
      expect(hasMarkup(text)).toBe(true);
    });

    it.each(['plain text', 'a < b', '(<20 mg/dL)', '<>', '< b>', '<1a>'])('finds none in %s', (text) => {
      expect(hasMarkup(text)).toBe(false);
    });
  });

  describe('areValidReferences', () => {
    const TEXT = 'A taxonomic order within the class.';
    const ORDER = { start: 12, end: 17, url: wordnik('order') };
    const CLASS = { start: 29, end: 34, url: wordnik('class') };

    it('accepts ordered, separate references that fit the text', () => {
      expect(areValidReferences(TEXT, [ORDER, CLASS])).toBe(true);
    });

    it('accepts references that touch end to start', () => {
      expect(areValidReferences('abcd', [{ ...ORDER, start: 0, end: 2 }, { ...ORDER, start: 2, end: 4 }])).toBe(true);
    });

    it('accepts no references at all', () => {
      expect(areValidReferences(TEXT, [])).toBe(true);
    });

    it.each([
      ['a list that is not an array', ORDER],
      ['a reference that is not an object', ['order']],
      ['references out of order', [CLASS, ORDER]],
      ['overlapping references', [ORDER, { ...CLASS, start: 15 }]],
      ['a negative start', [{ ...ORDER, start: -1 }]],
      ['an end past the text', [{ ...CLASS, end: TEXT.length + 1 }]],
      ['an empty range', [{ ...ORDER, end: 12 }]],
      ['a reversed range', [{ ...ORDER, start: 17, end: 12 }]],
      ['a range over blank text', [{ ...ORDER, start: 11, end: 12 }]],
      ['an offset that is not an integer', [{ ...ORDER, end: 16.5 }]],
      ['an offset that is not a number', [{ ...ORDER, start: '12' }]],
      ['a relative URL', [{ ...ORDER, url: '/words/order' }]],
      ['a URL that is not http(s)', [{ ...ORDER, url: 'javascript:alert(1)' }]],
      ['a missing URL', [{ start: 12, end: 17 }]],
      ['a key outside the reference', [{ ...ORDER, label: 'order' }]],
    ])('rejects %s', (_case, references) => {
      expect(areValidReferences(TEXT, references)).toBe(false);
    });
  });

  describe('toDefinitionSegments', () => {
    it('splits canonical text at its references', () => {
      const definition = {
        text: 'A taxonomic order within the class Arachnida.',
        references: [
          { start: 12, end: 17, url: wordnik('order') },
          { start: 29, end: 34, url: wordnik('class') },
          { start: 35, end: 44, url: wordnik('arachnida') },
        ],
      };

      expect(toDefinitionSegments(definition)).toStrictEqual([
        textRun('A taxonomic '),
        referenceRun('order', wordnik('order')),
        textRun(' within the '),
        referenceRun('class', wordnik('class')),
        textRun(' '),
        referenceRun('Arachnida', wordnik('arachnida')),
        textRun('.'),
      ]);
    });

    it('starts and ends with a reference when the text does', () => {
      expect(toDefinitionSegments({ text: 'rest', references: [{ start: 0, end: 4, url: wordnik('rest') }] }))
        .toStrictEqual([referenceRun('rest', wordnik('rest'))]);
    });

    it('returns plain text as one run', () => {
      expect(toDefinitionSegments({ text: 'to read aloud' })).toStrictEqual([textRun('to read aloud')]);
    });

    it('uses canonical text as it is, without reading it as markup', () => {
      expect(toDefinitionSegments({ text: 'AT&amp;T', references: [{ start: 0, end: 8, url: 'https://example.com/att' }] }))
        .toStrictEqual([referenceRun('AT&amp;T', 'https://example.com/att')]);
    });

    it('drops the whitespace around the whole, even from inside a reference', () => {
      expect(toDefinitionSegments({ text: '  a rest  ', references: [{ start: 1, end: 3, url: wordnik('a') }] }))
        .toStrictEqual([referenceRun('a', wordnik('a')), textRun(' rest')]);
      expect(toDefinitionSegments({ text: ' <xref>rest</xref> \n' })).toStrictEqual([textRun('<xref>rest</xref>')]);
    });

    it('returns nothing for blank text', () => {
      expect(toDefinitionSegments({ text: '   ' })).toStrictEqual([]);
    });

    const canonicalTextCases: Array<[
      string,
      string,
      (DefinitionSegment | DefinitionSegment[] | undefined)?,
    ]> = [
      ['a script element', '<script>alert(1)</script>'],
      ['an image with an event handler', 'a <img src=x onerror=alert(1)> b'],
      ['an unbalanced tag', '<b>bold <xref>rest'],
      ['an encoded script element', '&lt;script&gt;alert(1)&lt;/script&gt;'],
      ['a bracket that is not a tag', 'a < b', [textRun('a < b')]],
      ['a nested xref', '<xref>a <xref>b</xref> c</xref>'],
    ];

    it.each(canonicalTextCases)('keeps canonical %s as escaped text data', (_case, text, expected = textRun(text)) => {
      expect(toDefinitionSegments({ text })).toStrictEqual(Array.isArray(expected) ? expected : [expected]);
    });

    it('throws when stored references do not fit the text', () => {
      expect(() => toDefinitionSegments({ text: 'a rest', references: [{ start: 2, end: 9, url: wordnik('rest') }] }))
        .toThrow('Cross-references do not fit the definition "a rest"');
      expect(() => toDefinitionSegments({ text: 'a rest', references: [{ start: 2, end: 6, url: 'javascript:alert(1)' }] }))
        .toThrow('Cross-references do not fit');
    });
  });
});
