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
  vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
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
  ])('refuses %s without reporting an error', async (_, input, options, message) => {
    const code = await runAddWord(input, options);

    expect(code).toBe(1);
    expect(ctx.logger.warn).toHaveBeenCalledExactlyOnceWith(message, expect.any(Object));
    expect(ctx.logger.error).not.toHaveBeenCalled();
  });
});
