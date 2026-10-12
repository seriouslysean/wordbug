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
      files: [{ word: 'alpha', date: '20250701', path: path.join(yearDir, '20250701.json'), adapter: 'wordnik' }],
      failures: [],
    });
    expect(ctx.logger.error).not.toHaveBeenCalled();
  });

  // The loader builds any .json file, whatever its name, on the date it
  // stores. regenerate-all-words writes the entry's date back into the file.
  it('dates an entry by the stored record, never by the file name', async () => {
    const filePath = path.join(wordsDir(), 'alpha.json');
    fs.mkdirSync(wordsDir(), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ ...STORED, date: '20240101' }));
    const { getWordFiles } = await import('#tools/utils');

    expect(getWordFiles()).toEqual({ files: [{ word: 'alpha', date: '20240101', path: filePath, adapter: 'wordnik' }], failures: [] });
  });

  it.each([
    ['no date', { word: 'alpha' }],
    ['a date that is no calendar day', { ...STORED, date: '20250230' }],
  ])('reports a file with %s as a failure, since nothing else can date it', async (_, stored) => {
    const filePath = path.join(wordsDir(), '2025', '20250701.json');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(stored));
    const { getWordFiles } = await import('#tools/utils');

    expect(getWordFiles()).toEqual({ files: [], failures: [filePath] });
    expect(ctx.logger.error).toHaveBeenCalledExactlyOnceWith('Failed to read word file', expect.objectContaining({ file: '20250701.json' }));
  });
});

// One rule for every tool: the files the content collection's loader in
// src/content.config.ts builds from (`**/*.json` under the words directory)
describe('the files that count as word files', () => {
  const write = (relativePath: string, word: string): string => {
    const filePath = path.join(wordsDir(), relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ ...STORED, word, date: path.basename(relativePath, '.json') }));
    return filePath;
  };

  it('are every .json file at any depth, without dotfiles or dot directories', async () => {
    const built = [
      write('2025/20250701.json', 'alpha'),
      write('20250702.json', 'at the top'),
      write('drafts/20250703.json', 'outside a year'),
      write('2025/q3/20250704.json', 'nested'),
    ];
    write('2025/._20250701.json', 'AppleDouble');
    write('.trash/20250705.json', 'in a dot directory');
    write('2025/20250706.json.bak', 'not .json');
    write('2025/20250707.JSON', 'not lower case');
    const { listWordFilePaths } = await import('#tools/word-file-paths');
    const { getWordFiles } = await import('#tools/utils');

    expect(listWordFilePaths(wordsDir())).toEqual({ files: built.toSorted(), unreadable: [] });
    expect(getWordFiles().files.map(file => file.path).toSorted()).toEqual(built.toSorted());
    expect(getWordFiles().files.map(file => file.date)).toEqual(['20250704', '20250703', '20250702', '20250701']);
  });

  // The loader would list 2025 under both names. A tool that did would
  // regenerate or draw each of its words twice.
  it('follow a linked directory, and list one reached twice under the path that sorts first', async () => {
    const real = write('2025/20250701.json', 'alpha');
    fs.symlinkSync(path.join(wordsDir(), '2025'), path.join(wordsDir(), '2024'));
    fs.symlinkSync(path.join(wordsDir(), '2025'), path.join(wordsDir(), 'linked'));
    fs.symlinkSync(wordsDir(), path.join(wordsDir(), '2025', 'loop'));
    fs.symlinkSync(path.join(wordsDir(), 'gone'), path.join(wordsDir(), 'broken.json'));
    const { listWordFilePaths } = await import('#tools/word-file-paths');

    expect(listWordFilePaths(wordsDir())).toEqual({
      files: [path.join(wordsDir(), '2024', path.basename(real))],
      unreadable: [],
    });
  });

  // Root reads everything, so the mode bits cannot make a directory unreadable for it
  it.skipIf(process.getuid?.() === 0)('report a directory that cannot be listed as a failure', async () => {
    write('2025/20250701.json', 'alpha');
    const locked = path.join(wordsDir(), '2024');
    write('2024/20240701.json', 'beta');
    fs.chmodSync(locked, 0o000);
    const { getWordFiles } = await import('#tools/utils');

    try {
      const scan = getWordFiles();

      expect(scan.files.map(file => file.word)).toEqual(['alpha']);
      expect(scan.failures).toEqual([locked]);
      expect(ctx.logger.error).toHaveBeenCalledExactlyOnceWith('Failed to read words directory', expect.objectContaining({ directory: locked }));
    } finally {
      fs.chmodSync(locked, 0o700);
    }
  });
});

describe('findExistingWord with malformed stored data', () => {
  it('reports a file whose headword is readable but whose record is invalid', async () => {
    const yearDir = path.join(wordsDir(), '2025');
    const filePath = path.join(yearDir, '20250701.json');
    fs.mkdirSync(yearDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ word: 'alpha', date: '20250701' }));
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
    fs.writeFileSync(malformedPath, JSON.stringify({ word: 'alpha', date: '20250702' }));
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
