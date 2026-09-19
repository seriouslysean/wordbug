/**
 * Word discovery (getWordFiles), which every tool reads the corpus through,
 * and add-word's duplicate check built on it (findExistingWord). Runs against
 * a temp words tree through a mocked #config/paths, with the logger mocked to
 * see what is reported.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

const STORED = { word: 'alpha', date: '20250701', adapter: 'wordnik', data: [{ text: 'a letter', partOfSpeech: 'noun' }] };

const createLogger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() });
const ctx = { root: '', logger: createLogger() };

const wordsDir = () => path.join(ctx.root, 'words');

beforeEach(() => {
  ctx.root = fs.mkdtempSync(path.join(os.tmpdir(), 'wotd-word-files-'));
  ctx.logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

  vi.resetModules();
  vi.doMock('#config/paths', () => ({
    paths: { words: wordsDir(), images: ctx.root, fonts: ctx.root, pages: ctx.root },
  }));
  vi.doMock('#utils/logger', async (importOriginal) => ({
    ...await importOriginal(),
    logger: ctx.logger,
  }));
});

afterEach(() => {
  vi.doUnmock('#config/paths');
  vi.doUnmock('#utils/logger');
  vi.resetModules();
  fs.rmSync(ctx.root, { recursive: true, force: true });
});

describe('getWordFiles', () => {
  it('skips the AppleDouble file macOS writes beside a word file', async () => {
    const yearDir = path.join(wordsDir(), '2025');
    fs.mkdirSync(yearDir, { recursive: true });
    fs.writeFileSync(path.join(yearDir, '20250701.json'), JSON.stringify(STORED));
    // Resource-fork metadata, not JSON
    fs.writeFileSync(path.join(yearDir, '._20250701.json'), Buffer.from([0, 5, 22, 7, 0, 2, 0, 0]));
    const { getWordFiles } = await import('#tools/utils');

    expect(getWordFiles()).toEqual({
      files: [{ word: 'alpha', date: '20250701', path: path.join(yearDir, '20250701.json') }],
      failures: [],
    });
    expect(ctx.logger.error).not.toHaveBeenCalled();
  });
});

describe('findExistingWord with malformed stored data', () => {
  it('reports a file whose headword is readable but whose record is invalid', async () => {
    const yearDir = path.join(wordsDir(), '2025');
    const filePath = path.join(yearDir, '20250701.json');
    fs.mkdirSync(yearDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ word: 'alpha' }));
    const { findExistingWord } = await import('#tools/utils');

    expect(findExistingWord('beta')).toEqual({ match: null, failures: [filePath] });
    expect(ctx.logger.error).toHaveBeenCalledOnce();
    expect(ctx.logger.warn).not.toHaveBeenCalled();
  });

  it('keeps parse failures when it finds a valid word elsewhere', async () => {
    const yearDir = path.join(wordsDir(), '2025');
    const malformedPath = path.join(yearDir, '20250702.json');
    const validPath = path.join(yearDir, '20250701.json');
    fs.mkdirSync(yearDir, { recursive: true });
    fs.writeFileSync(malformedPath, JSON.stringify({ word: 'alpha' }));
    fs.writeFileSync(validPath, JSON.stringify({ ...STORED, word: 'beta', date: '20250701' }));
    const { findExistingWord } = await import('#tools/utils');

    expect(findExistingWord('beta')).toEqual({
      match: { ...STORED, word: 'beta', date: '20250701' },
      failures: [malformedPath],
    });
    expect(ctx.logger.error).toHaveBeenCalledOnce();
    expect(ctx.logger.warn).not.toHaveBeenCalled();
  });
});

describe('a site with no words yet', () => {
  const noCorpus: Array<[string, () => void]> = [
    ['no words directory', () => {}],
    ['a words directory with no years', () => fs.mkdirSync(wordsDir())],
    // What a failed first add-word leaves: the year directory is made before the fetch
    ['a year directory with no word files', () => fs.mkdirSync(path.join(wordsDir(), '2025'), { recursive: true })],
  ];

  it.each(noCorpus)('has no existing word for add-word\'s duplicate check, which allows it, with %s', async (_, setUp) => {
    setUp();
    const { findExistingWord } = await import('#tools/utils');

    expect(findExistingWord('alpha', { allowEmpty: true })).toEqual({ match: null, failures: [] });
    expect(ctx.logger.error).not.toHaveBeenCalled();
  });

  it.each(noCorpus)('is reported at error to a lookup that needs data, with %s', async (_, setUp) => {
    setUp();
    const { findExistingWord } = await import('#tools/utils');

    // generate-images --word: with no corpus the word cannot be looked up
    expect(findExistingWord('alpha')).toEqual({ match: null, failures: [wordsDir()] });
    expect(ctx.logger.error).toHaveBeenCalledOnce();
  });

  it.each(noCorpus)('is a failure to the bulk tools, which need data, with %s', async (_, setUp) => {
    setUp();
    const { getAllWords, getWordFiles } = await import('#tools/utils');

    // generate-images reads getAllWords, regenerate-all-words getWordFiles
    expect(getAllWords().failures).toEqual([wordsDir()]);
    expect(getWordFiles().failures).toEqual([wordsDir()]);
    expect(ctx.logger.error).toHaveBeenCalledTimes(2);
  });
});
