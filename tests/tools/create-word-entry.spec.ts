/**
 * Stored word files for both case modes. Case is the caller's decision
 * (createWordEntry, via --preserve-case); adapters report what they are given.
 * Runs the real Merriam-Webster adapter against a fixture with fetch stubbed,
 * and writes to a temp dir through a mocked #config/paths.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

const FIXTURE = JSON.parse(fs.readFileSync(
  path.join(import.meta.dirname, '..', 'adapters', 'fixtures', 'merriam-webster', 'serendipity.json'),
  'utf-8',
));
const RELATIONS = { synonyms: ['luck'], antonyms: [], related: [] };
const DATE = '20250101';
const fetchMock = vi.fn<typeof fetch>();
const relationsMock = vi.fn<(...args: Parameters<(typeof import('#adapters/wordnet'))['getWordRelations']>) =>
  ReturnType<(typeof import('#adapters/wordnet'))['getWordRelations']>>();

const ctx = { wordsDir: '', fetch: fetchMock, getWordRelations: relationsMock };

type CreateEntryOptions = Partial<Parameters<(typeof import('#tools/utils'))['createWordEntry']>[1]>;

const createEntry = async (word: string, options: CreateEntryOptions = {}) => {
  const { createWordEntry } = await import('#tools/utils');
  const { filePath } = await createWordEntry(word, { date: DATE, ...options });
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

beforeEach(() => {
  ctx.wordsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wotd-create-entry-'));
  ctx.fetch.mockReset();
  ctx.fetch.mockResolvedValue(new Response(JSON.stringify(FIXTURE), { status: 200, statusText: 'OK' }));
  ctx.getWordRelations.mockReset();
  ctx.getWordRelations.mockResolvedValue(RELATIONS);

  vi.resetModules();
  vi.stubGlobal('fetch', ctx.fetch);
  vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
  vi.stubEnv('DICTIONARY_FALLBACK', 'none');
  vi.stubEnv('MERRIAM_WEBSTER_API_KEY', 'test-key');
  vi.doMock('#config/paths', () => ({
    paths: { words: ctx.wordsDir, images: ctx.wordsDir, fonts: ctx.wordsDir, pages: ctx.wordsDir },
  }));
  vi.doMock('#adapters/wordnet', () => ({ getWordRelations: ctx.getWordRelations }));
});

afterEach(() => {
  vi.doUnmock('#config/paths');
  vi.doUnmock('#adapters/wordnet');
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
  fs.rmSync(ctx.wordsDir, { recursive: true, force: true });
});

describe('createWordEntry stored output', () => {
  it('lowercases the word by default, for the lookup and for the file', async () => {
    const stored = await createEntry('Serendipity');

    expect(stored.word).toBe('serendipity');
    expect(stored.preserveCase).toBe(false);
    expect(stored.adapter).toBe('merriam-webster');
    expect(stored.data[0].sourceUrl).toBe('https://www.merriam-webster.com/dictionary/serendipity');
    expect(stored.enrichment.synonyms).toEqual(['luck']);
    expect(String(ctx.fetch.mock.calls[0]?.[0])).toContain('/json/serendipity?');
  });

  it.each([
    ['Japan', 'Japan'],
    ['PB&J', 'PB%26J'],
  ])('keeps %s as typed with preserveCase', async (word, encoded) => {
    const stored = await createEntry(word, { preserveCase: true });

    expect(stored.word).toBe(word);
    expect(stored.preserveCase).toBe(true);
    expect(stored.data[0].sourceUrl).toBe(`https://www.merriam-webster.com/dictionary/${encoded}`);
    expect(stored.enrichment.synonyms).toEqual(['luck']);
    expect(String(ctx.fetch.mock.calls[0]?.[0])).toContain(`/json/${encoded}?`);
  });

  it('lowercases the WordNet lookup key itself, since the WordNet index is lowercase', async () => {
    await createEntry('Japan', { preserveCase: true });

    expect(ctx.getWordRelations).toHaveBeenCalledWith('japan', expect.anything());
  });
});
