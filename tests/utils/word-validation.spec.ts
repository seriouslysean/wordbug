import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { isWordData, parseWordData } from '#utils/stored-word-validation';
import { isWordIndex } from '#utils/word-validation';

const DEMO_WORD_FILE = path.join(import.meta.dirname, '..', '..', 'data', 'demo', 'words', '2025', '20250101.json');
const VALID_WORD = { word: 'test', date: '20250101', adapter: 'wordnik', data: [{ text: 'a test', partOfSpeech: 'noun' }] };

describe('word-validation', () => {
  describe('isWordData', () => {
    it('accepts a stored demo word file', () => {
      expect(isWordData(JSON.parse(fs.readFileSync(DEMO_WORD_FILE, 'utf-8')))).toBe(true);
    });

    it('accepts the minimal shape and the optional fields', () => {
      expect(isWordData(VALID_WORD)).toBe(true);
      expect(isWordData({
        ...VALID_WORD,
        preserveCase: true,
        rawData: { anything: 1 },
        enrichment: { synonyms: ['exam'], pronunciation: 'test', audio: 'https://example.com/t.mp3', etymology: 'Latin' },
        data: [
          {
            id: 'test', text: 'a test', examples: ['x'], synonyms: ['exam'], antonyms: ['answer'],
            sourceUrl: 'https://example.com/test',
          },
          { text: 'x', label: 'affix' },
          { text: 'a rest', references: [{ start: 2, end: 6, url: 'https://www.wordnik.com/words/rest' }] },
        ],
      })).toBe(true);
    });

    it('rejects non-objects', () => {
      expect(isWordData(null)).toBe(false);
      expect(isWordData([])).toBe(false);
      expect(isWordData('test')).toBe(false);
    });

    it('rejects missing or mistyped required fields', () => {
      expect(isWordData({ ...VALID_WORD, word: undefined })).toBe(false);
      expect(isWordData({ ...VALID_WORD, word: 1 })).toBe(false);
      expect(isWordData({ ...VALID_WORD, date: 20250101 })).toBe(false);
      expect(isWordData({ ...VALID_WORD, adapter: undefined })).toBe(false);
      expect(isWordData({ ...VALID_WORD, data: undefined })).toBe(false);
      expect(isWordData({ ...VALID_WORD, data: {} })).toBe(false);
      expect(isWordData({ ...VALID_WORD, extra: true })).toBe(false);
      // The content schema requires at least one definition; a file without
      // one fails the build, so the CLI must not accept it either
      expect(isWordData({ ...VALID_WORD, data: [] })).toBe(false);
    });

    it('rejects malformed definitions', () => {
      const withDefinition = (definition: unknown) => ({ ...VALID_WORD, data: [definition] });
      expect(isWordData(withDefinition(null))).toBe(false);
      expect(isWordData(withDefinition('a test'))).toBe(false);
      expect(isWordData(withDefinition({ id: 1 }))).toBe(false);
      expect(isWordData(withDefinition({ partOfSpeech: 1 }))).toBe(false);
      expect(isWordData(withDefinition({ label: 1 }))).toBe(false);
      expect(isWordData(withDefinition({ text: 1 }))).toBe(false);
      expect(isWordData(withDefinition({ text: ['a', 1] }))).toBe(false);
      expect(isWordData(withDefinition({ text: 'a rest', references: 'rest' }))).toBe(false);
      expect(isWordData(withDefinition({ text: 'a rest', references: [{ start: '2', end: 6, url: 'https://example.com' }] }))).toBe(false);
      expect(isWordData(withDefinition({ text: 'a rest', references: [{ start: 2, end: 6.5, url: 'https://example.com' }] }))).toBe(false);
      expect(isWordData(withDefinition({ text: 'a rest', references: [{ start: 2, end: 6 }] }))).toBe(false);
      expect(isWordData(withDefinition({ text: 'a rest', references: [{ start: 2, end: 6, url: 'javascript:alert(1)' }] }))).toBe(false);
      expect(isWordData(withDefinition({ text: 'a rest', references: [{ start: 2, end: 9, url: 'https://example.com' }] }))).toBe(false);
      expect(isWordData(withDefinition({ text: ['a', 'rest'], references: [{ start: 2, end: 6, url: 'https://example.com' }] }))).toBe(false);
      expect(isWordData(withDefinition({ text: 'a rest', partOfSpeech: 'transitive verb' }))).toBe(false);
      expect(isWordData(withDefinition({ text: 'a rest', partOfSpeech: 'noun', label: 'thing' }))).toBe(false);
      expect(isWordData(withDefinition({ text: 'a rest', examples: [] }))).toBe(false);
      expect(isWordData(withDefinition({ text: 'a rest', extra: true }))).toBe(false);
      expect(isWordData(withDefinition({ attributionText: 1 }))).toBe(false);
      expect(isWordData(withDefinition({ sourceDictionary: 1 }))).toBe(false);
      expect(isWordData(withDefinition({ sourceUrl: 1 }))).toBe(false);
      expect(isWordData(withDefinition({ examples: 'x' }))).toBe(false);
      expect(isWordData(withDefinition({ synonyms: [1] }))).toBe(false);
      expect(isWordData(withDefinition({ antonyms: 'x' }))).toBe(false);
    });

    it('rejects malformed optional fields', () => {
      expect(isWordData({ ...VALID_WORD, preserveCase: 'true' })).toBe(false);
      expect(isWordData({ ...VALID_WORD, enrichment: [] })).toBe(false);
      expect(isWordData({ ...VALID_WORD, enrichment: { synonyms: 'x' } })).toBe(false);
      expect(isWordData({ ...VALID_WORD, enrichment: { antonyms: 'x' } })).toBe(false);
      expect(isWordData({ ...VALID_WORD, enrichment: { related: [1] } })).toBe(false);
      expect(isWordData({ ...VALID_WORD, enrichment: { pronunciation: { raw: 'x' } } })).toBe(false);
      expect(isWordData({ ...VALID_WORD, enrichment: { audio: 1 } })).toBe(false);
      expect(isWordData({ ...VALID_WORD, enrichment: { etymology: ['x'] } })).toBe(false);
      expect(isWordData({ ...VALID_WORD, enrichment: { note: 'unknown' } })).toBe(false);
    });
  });

  describe('parseWordData', () => {
    it('returns the parsed word', () => {
      expect(parseWordData(JSON.stringify(VALID_WORD), 'words/2025/20250101.json')).toEqual(VALID_WORD);
    });

    it('names the file when the shape is wrong', () => {
      expect(() => parseWordData('{"word":"test"}', 'words/2025/20250101.json')).toThrow(
        'Invalid word data in words/2025/20250101.json',
      );
    });

    it('throws on invalid JSON', () => {
      expect(() => parseWordData('{not json', 'words/2025/20250101.json')).toThrow(SyntaxError);
    });
  });

  describe('isWordIndex', () => {
    it('accepts an array of word and date rows, including an empty one', () => {
      expect(isWordIndex([{ word: 'test', date: 'Jan 1, 2025' }])).toBe(true);
      expect(isWordIndex([])).toBe(true);
    });

    it('rejects non-arrays and malformed rows', () => {
      expect(isWordIndex({ words: [] })).toBe(false);
      expect(isWordIndex(null)).toBe(false);
      expect(isWordIndex([null])).toBe(false);
      expect(isWordIndex(['test'])).toBe(false);
      expect(isWordIndex([{ word: 'test' }])).toBe(false);
      expect(isWordIndex([{ word: 1, date: 'Jan 1, 2025' }])).toBe(false);
      expect(isWordIndex([{ word: 'test', date: 20250101 }])).toBe(false);
    });
  });

});
