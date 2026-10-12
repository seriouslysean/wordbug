/**
 * regenerate-all-words --adapter: how a site replaces the words one
 * dictionary supplied with a fresh lookup through the dictionaries it has
 * now. The real tool in a subprocess, in a temp cwd, with the Wiktionary
 * adapter pointed at a local server that answers with recorded bodies: no
 * request leaves the machine and nothing under data/ is touched.
 */

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  afterAll, afterEach, beforeAll, beforeEach, describe, expect, it,
} from 'vitest';

import { spawnTool } from '#tests/helpers/spawn.ts';

const TOOL = path.join(process.cwd(), 'tools', 'regenerate-all-words.ts');
const LOG_LEVELS = pathToFileURL(path.join(process.cwd(), 'tests', 'helpers', 'log-levels.ts')).href;
const FIXTURES_DIR = path.join(process.cwd(), 'tests', 'adapters', 'fixtures', 'wiktionary');
const fixture = (name: string): string => fs.readFileSync(path.join(FIXTURES_DIR, `${name}.json`), 'utf-8');

// What the stand-in for Wiktionary has an entry for, by page title
const PAGES: Record<string, string> = {
  serendipity: fixture('serendipity'),
  Amblypygi: fixture('Amblypygi'),
};
const NOT_FOUND = fixture('not-found');

const ctx: { tempDir: string; server: http.Server | null; baseUrl: string; requested: string[] } = {
  tempDir: '',
  server: null,
  baseUrl: '',
  requested: [],
};

const definition = { partOfSpeech: 'noun', text: 'A stored definition.' };
const STORED = {
  '20240101.json': {
    word: 'serendipity',
    date: '20240101',
    adapter: 'wordnik',
    preserveCase: false,
    data: [definition],
    enrichment: { pronunciation: 'sĕr″ən-dĭp′ĭ-tē' },
  },
  '20240102.json': { word: 'Amblypygi', date: '20240102', adapter: 'wordnik', preserveCase: true, data: [definition] },
  '20240103.json': { word: 'zzzznotaword', date: '20240103', adapter: 'wordnik', preserveCase: false, data: [definition] },
  '20240104.json': { word: 'beta', date: '20240104', adapter: 'merriam-webster', preserveCase: false, data: [definition] },
};
type StoredFile = keyof typeof STORED;

const filePath = (name: string): string => path.join(ctx.tempDir, 'data', 'words', '2024', name);
const contents = (name: StoredFile): string => JSON.stringify(STORED[name], null, 4);
const read = (name: StoredFile): string => fs.readFileSync(filePath(name), 'utf-8');

const run = (args: string[]) => spawnTool(['--import', LOG_LEVELS, TOOL, '--timeout=0', '--batch-timeout=0', ...args], {
  env: {
    SOURCE_DIR: '',
    DICTIONARY_ADAPTER: 'wiktionary',
    DICTIONARY_FALLBACK: 'none',
    WIKTIONARY_API_URL: ctx.baseUrl,
    SENTRY_ENABLED: 'false',
  },
  cwd: ctx.tempDir,
  timeout: 30000,
});

beforeAll(async () => {
  const server = http.createServer((request, response) => {
    const title = decodeURIComponent((request.url ?? '').split('/').at(-1) ?? '');
    ctx.requested.push(title);
    const body = PAGES[title];
    response.writeHead(body ? 200 : 404, { 'Content-Type': 'application/json' });
    response.end(body ?? NOT_FOUND);
  });
  const { promise, resolve } = Promise.withResolvers<void>();
  server.listen(0, '127.0.0.1', resolve);
  await promise;
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('expected the server to listen on a port');
  }
  ctx.server = server;
  ctx.baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(() => {
  ctx.server?.close();
});

beforeEach(() => {
  ctx.requested = [];
  ctx.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wotd-regen-adapter-'));
  fs.mkdirSync(path.dirname(filePath('x')), { recursive: true });
  for (const [name, record] of Object.entries(STORED)) {
    fs.writeFileSync(filePath(name), JSON.stringify(record, null, 4));
  }
});

afterEach(() => {
  fs.rmSync(ctx.tempDir, { recursive: true, force: true });
});

describe('regenerate-all-words --adapter', { timeout: 35000 }, () => {
  it('previews only the words the named dictionary supplied, without a lookup', async () => {
    const { stdout, code } = await run(['--adapter', 'wordnik', '--dry-run']);

    expect(code).toBe(0);
    expect(stdout).toContain('serendipity');
    expect(stdout).toContain('Amblypygi');
    expect(stdout).toContain('zzzznotaword');
    expect(stdout).not.toContain('beta');
    expect(ctx.requested).toEqual([]);
    expect(read('20240101.json')).toBe(contents('20240101.json'));
  });

  it('replaces each of them that the dictionary now has, and leaves the rest of the corpus alone', async () => {
    const { stdout, stderr, code } = await run(['--adapter', 'wordnik', '--force']);

    // zzzznotaword has no entry, so the run as a whole did not succeed
    expect(code).toBe(1);
    expect(`${stdout}${stderr}`).toMatch(/Regeneration finished with failures.*failed: 1/s);
    expect(ctx.requested.toSorted()).toEqual(['Amblypygi', 'serendipity', 'zzzznotaword']);

    const resourced = JSON.parse(read('20240101.json'));
    expect(resourced).toMatchObject({ word: 'serendipity', date: '20240101', adapter: 'wiktionary', preserveCase: false });
    expect(resourced.data).toHaveLength(3);
    expect(resourced.data[0].sourceUrl).toBe('https://en.wiktionary.org/wiki/serendipity');
    // What Wordnik supplied does not stay on under Wiktionary's name
    expect(resourced.enrichment?.pronunciation).toBeUndefined();

    // Looked up, and stored, in the case the record keeps
    expect(JSON.parse(read('20240102.json'))).toMatchObject({
      word: 'Amblypygi', date: '20240102', adapter: 'wiktionary', preserveCase: true,
    });

    // A word that could not be re-sourced keeps its record, byte for byte
    expect(read('20240103.json')).toBe(contents('20240103.json'));
    // A word another dictionary supplied is never looked up
    expect(read('20240104.json')).toBe(contents('20240104.json'));
  });

  it('exits 0 once every one of them is replaced', async () => {
    fs.rmSync(filePath('20240103.json'));

    const first = await run(['--adapter', 'wordnik', '--force']);
    expect(first.code).toBe(0);

    // A second run finds none, and says what is stored instead of passing
    // for a run that regenerated something
    ctx.requested = [];
    const second = await run(['--adapter', 'wordnik', '--force']);
    expect(second.code).toBe(1);
    expect(second.stderr).toContain('[warn] No stored word has that adapter');
    expect(second.stderr).toContain("stored: 'merriam-webster (1), wiktionary (2)'");
    expect(second.stderr).not.toContain('[error]');
    expect(ctx.requested).toEqual([]);
  });

  it.each([
    ['a name in another case', 'Wordnik'],
    ['a name nothing stores', 'nosuch'],
    ['an empty name', ''],
  ])('refuses %s instead of finishing with nothing done', async (_, name) => {
    for (const args of [['--dry-run'], ['--force']]) {
      const { stdout, stderr, code } = await run([`--adapter=${name}`, ...args]);

      expect(code).toBe(1);
      expect(stderr).toContain('[warn] No stored word has that adapter');
      expect(stderr).toContain("stored: 'merriam-webster (1), wordnik (3)'");
      expect(stderr).not.toContain('[error]');
      expect(stdout).not.toContain('Regeneration complete');
    }
    expect(ctx.requested).toEqual([]);
    expect(read('20240101.json')).toBe(contents('20240101.json'));
  });
});

// The fallback answers whenever the primary fails, whatever the reason. A
// plain refresh must not let that move a record to the fallback's dictionary.
describe('regenerate-all-words without --adapter', { timeout: 35000 }, () => {
  const MW_RECORD = {
    word: 'serendipity',
    date: '20240101',
    adapter: 'merriam-webster',
    preserveCase: false,
    data: [definition],
    enrichment: { pronunciation: 'ˌser-ən-ˈdi-pə-tē', etymology: 'from its possession by the heroes of a Persian fairy tale' },
  };
  const WIKTIONARY_RECORD = { word: 'Amblypygi', date: '20240102', adapter: 'wiktionary', preserveCase: true, data: [definition] };

  // Merriam-Webster does not answer for the word: its endpoint is a path this
  // server has nothing at. Any primary failure takes the same road to the fallback.
  const runAsMerriamWebsterSite = (args: string[]) => spawnTool(['--import', LOG_LEVELS, TOOL, '--timeout=0', '--batch-timeout=0', ...args], {
    env: {
      SOURCE_DIR: '',
      DICTIONARY_ADAPTER: 'merriam-webster',
      DICTIONARY_FALLBACK: 'wiktionary',
      MERRIAM_WEBSTER_API_KEY: 'test-key',
      MERRIAM_WEBSTER_API_URL: `${ctx.baseUrl}/down`,
      WIKTIONARY_API_URL: ctx.baseUrl,
      SENTRY_ENABLED: 'false',
    },
    cwd: ctx.tempDir,
    timeout: 30000,
  });

  beforeEach(() => {
    for (const name of Object.keys(STORED)) {
      fs.rmSync(filePath(name));
    }
    fs.writeFileSync(filePath('20240101.json'), JSON.stringify(MW_RECORD, null, 4));
    fs.writeFileSync(filePath('20240102.json'), JSON.stringify(WIKTIONARY_RECORD, null, 4));
  });

  it('keeps a record the fallback answered for, counts it as failed, and still refreshes the rest', async () => {
    const { stdout, stderr, code } = await runAsMerriamWebsterSite(['--force']);

    expect(code).toBe(1);
    expect(`${stdout}${stderr}`).toMatch(/Regeneration complete.*success: 1.*failed: 1/s);
    expect(stderr).toContain('is stored from merriam-webster and was answered by wiktionary; the stored record is kept');
    // The Merriam-Webster record, its pronunciation and etymology included, is as it was
    expect(fs.readFileSync(filePath('20240101.json'), 'utf-8')).toBe(JSON.stringify(MW_RECORD, null, 4));
    // The record Wiktionary wrote is refreshed from Wiktionary
    expect(JSON.parse(fs.readFileSync(filePath('20240102.json'), 'utf-8'))).toMatchObject({
      word: 'Amblypygi', adapter: 'wiktionary', data: [{ sourceUrl: 'https://en.wiktionary.org/wiki/Amblypygi' }],
    });
  });

  it('skips a word written by hand without a lookup, and a skip fails nothing', async () => {
    const MANUAL_RECORD = { word: 'serendipity', date: '20240101', adapter: 'manual', preserveCase: false, data: [definition] };
    fs.writeFileSync(filePath('20240101.json'), JSON.stringify(MANUAL_RECORD, null, 4));
    ctx.requested = [];

    const { stdout, stderr, code } = await runAsMerriamWebsterSite(['--force']);

    expect(code).toBe(0);
    expect(stdout).toMatch(/Skipping words written by hand.*skipped: 1/s);
    expect(stdout).toMatch(/Regeneration complete.*success: 1.*failed: 0.*skipped: 1.*total: 2/s);
    expect(stderr).not.toContain('[error]');
    // Asked of no dictionary, and as it was written
    expect(ctx.requested.filter(title => title.startsWith('serendipity'))).toEqual([]);
    expect(fs.readFileSync(filePath('20240101.json'), 'utf-8')).toBe(JSON.stringify(MANUAL_RECORD, null, 4));

    // A dry run lists only what would be looked up
    const dryRun = await runAsMerriamWebsterSite(['--dry-run']);
    expect(dryRun.code).toBe(0);
    expect(dryRun.stdout).toContain('Amblypygi');
    expect(dryRun.stdout).not.toContain("word: 'serendipity'");
  });

  it('refuses --adapter manual: there is no dictionary to re-source a hand-written word from', async () => {
    ctx.requested = [];

    for (const args of [['--dry-run'], ['--force']]) {
      const { stderr, code } = await runAsMerriamWebsterSite(['--adapter', 'manual', ...args]);

      expect(code).toBe(1);
      expect(stderr).toContain('[warn] Words written by hand cannot be re-sourced');
      expect(stderr).not.toContain('[error]');
    }
    expect(ctx.requested).toEqual([]);
  });

  it('lets --adapter move the same record, since changing dictionary is what it asks for', async () => {
    const { code } = await runAsMerriamWebsterSite(['--adapter', 'merriam-webster', '--force']);

    expect(code).toBe(0);
    expect(JSON.parse(fs.readFileSync(filePath('20240101.json'), 'utf-8'))).toMatchObject({ word: 'serendipity', adapter: 'wiktionary' });
  });
});
