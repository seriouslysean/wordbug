/**
 * A mistyped date, a future date or a duplicate is expected input, not an
 * application fault: add-word must refuse it with exit 1 and a clear message
 * at a level the CLI logger does not forward to Sentry (only `error` is).
 * Runs the real tool against a temp words dir through a mocked #config/paths.
 * The mocked exit never returns, as the real one never does, so nothing after
 * it can log.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

const STORED = { word: 'alpha', date: '20240101', adapter: 'wordnik', data: [{ text: 'a letter', partOfSpeech: 'noun' }] };

const createLogger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() });
const exitMock = vi.fn<(code: number) => Promise<never>>();
const ctx = { wordsDir: '', logger: createLogger(), exit: exitMock };
type AddWordOptions = Parameters<(typeof import('#tools/add-word'))['addWord']>[1];

const runAddWord = async (input: string, options: AddWordOptions): Promise<number> => {
  const { addWord } = await import('#tools/add-word');
  const { promise, resolve } = Promise.withResolvers<number>();
  ctx.exit.mockImplementation((code: number) => {
    resolve(code);
    return new Promise<never>(() => {});
  });
  addWord(input, options);
  return promise;
};

beforeEach(() => {
  ctx.wordsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wotd-add-word-input-'));
  fs.mkdirSync(path.join(ctx.wordsDir, '2024'));
  fs.writeFileSync(path.join(ctx.wordsDir, '2024', '20240101.json'), JSON.stringify(STORED));
  ctx.logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  ctx.exit.mockReset();

  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no network in tests'))));
  vi.stubEnv('DICTIONARY_ADAPTER', 'wiktionary');
  vi.doMock('#config/paths', () => ({
    paths: { words: ctx.wordsDir, images: ctx.wordsDir, fonts: ctx.wordsDir, pages: ctx.wordsDir },
  }));
  vi.doMock('#utils/logger', async (importOriginal) => ({
    ...await importOriginal(),
    logger: ctx.logger,
    exit: ctx.exit,
  }));
});

afterEach(() => {
  vi.doUnmock('#config/paths');
  vi.doUnmock('#utils/logger');
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
  fs.rmSync(ctx.wordsDir, { recursive: true, force: true });
});

describe('add-word input errors', () => {
  it.each([
    ['a blank word', '  ', {}, 'Word is required'],
    ['a malformed date', 'beta', { date: '2024-01-02' }, 'Invalid date format'],
    ['a future date', 'beta', { date: '29991231' }, 'Cannot add words for future dates'],
    ['a date that already has a word', 'beta', { date: '20240101' }, 'Word already exists for this date'],
    ['a word already used on another date', 'alpha', { date: '20240102' }, 'Word already exists for different date'],
    ['a word of symbols only, whose page would be /word/', '&', { date: '20240102' }, 'Word has no URL slug'],
    ['a word in a script the slug drops whole', '日本', { date: '20240102' }, 'Word has no URL slug'],
    ['a different word with the slug of a stored one', "al'pha", { date: '20240102' }, 'Word shares its URL slug with a different word'],
  ])('refuses %s without reporting an error', async (_, input, options, message) => {
    const code = await runAddWord(input, options);

    expect(code).toBe(1);
    expect(ctx.logger.warn).toHaveBeenCalledExactlyOnceWith(message, expect.any(Object));
    expect(ctx.logger.error).not.toHaveBeenCalled();
  });
});

// The site builds every .json file below the words directory, so a word can
// hold a date from a file add-word would not have written itself
describe('add-word and a date held by a file outside its year directory', () => {
  it('refuses the date, as it does one held by words/<year>/<date>.json', async () => {
    fs.mkdirSync(path.join(ctx.wordsDir, 'drafts'));
    fs.writeFileSync(path.join(ctx.wordsDir, 'drafts', '20250703.json'), JSON.stringify({ ...STORED, word: 'gamma', date: '20250703' }));

    const code = await runAddWord('beta', { date: '20250703' });

    expect(code).toBe(1);
    expect(ctx.logger.warn).toHaveBeenCalledExactlyOnceWith('Word already exists for this date', { date: '20250703', existingWord: 'gamma' });
    expect(fs.existsSync(path.join(ctx.wordsDir, '2025'))).toBe(false);
  });
});

describe('add-word and a word file it cannot read', () => {
  it('reports the file once, however many checks read the corpus', async () => {
    fs.writeFileSync(path.join(ctx.wordsDir, '2024', '20240102.json'), '{ "word": ');

    // Every check passes, so the run goes on to the lookup, which has no network
    const code = await runAddWord('beta', { date: '20240103' });

    expect(code).toBe(1);
    expect(ctx.logger.error.mock.calls.filter(([message]) => message === 'Failed to read word file'))
      .toEqual([['Failed to read word file', expect.objectContaining({ file: '20240102.json' })]]);
    expect(ctx.logger.error).toHaveBeenCalledWith('Failed to add word', expect.objectContaining({ word: 'beta' }));
  });
});
