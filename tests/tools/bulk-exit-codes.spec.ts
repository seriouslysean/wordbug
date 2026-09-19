/**
 * Bulk tools must report partial failure through their exit code: CI and
 * `npm run a && npm run b` chains only see the code, never the log lines.
 * Real subprocesses, no network, all output in temp dirs.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { spawnTool } from '#tests/helpers/spawn.ts';

const TOOLS_DIR = path.join(process.cwd(), 'tools');
const FONTS = ['LiberationSans-Regular.ttf', 'LiberationSans-Bold.ttf'];

const ctx = { tempDir: '' };

// A words tree under the temp cwd: tools resolve data/words from their cwd.
const writeWordFiles = (files: Record<string, string>) => {
  const yearDir = path.join(ctx.tempDir, 'data', 'words', '2024');
  fs.mkdirSync(yearDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(yearDir, name), content);
  }
};

const STORED_WORD = JSON.stringify({ word: 'alpha', date: '20240101', adapter: 'wordnik', data: [{ text: 'a letter', partOfSpeech: 'noun' }] });

beforeEach(() => {
  ctx.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wotd-bulk-'));
});

afterEach(() => {
  fs.rmSync(ctx.tempDir, { recursive: true, force: true });
});

describe('generate-images bulk run', () => {
  it('exits 1 with a failure count when jobs fail', async () => {
    // A regular file where the pages directory belongs makes every write fail.
    fs.mkdirSync(path.join(ctx.tempDir, 'social'));
    fs.writeFileSync(path.join(ctx.tempDir, 'social', 'pages'), '');

    const { stdout, stderr, code } = await spawnTool(
      ['tools/generate-images.ts', '--generic', '--force'],
      { env: { SOURCE_DIR: 'demo', IMAGES_OUTPUT_DIR: ctx.tempDir }, timeout: 30000 },
    );

    expect(code).toBe(1);
    expect(`${stdout}${stderr}`).toMatch(/Image generation finished with failures.*failed: \d+/s);
  }, 35000);
});

describe('generate-images with unreadable word files', () => {
  it('counts them as failures and does not certify the corpus', async () => {
    const fontsDir = path.join(ctx.tempDir, 'tools', 'fonts', 'liberation-sans');
    fs.mkdirSync(fontsDir, { recursive: true });
    for (const font of FONTS) {
      fs.copyFileSync(path.join(TOOLS_DIR, 'fonts', 'liberation-sans', font), path.join(fontsDir, font));
    }
    writeWordFiles({
      '20240101.json': STORED_WORD,
      // Not JSON: word discovery cannot read it
      '20240102.json': '{ "word": ',
      // A headword but no definitions: discovery lists it, parsing refuses it
      '20240103.json': JSON.stringify({ word: 'gamma' }),
    });
    const outputDir = path.join(ctx.tempDir, 'images');

    const { stdout, stderr, code } = await spawnTool(
      [path.join(TOOLS_DIR, 'generate-images.ts')],
      { env: { SOURCE_DIR: '', IMAGES_OUTPUT_DIR: outputDir }, cwd: ctx.tempDir, timeout: 60000 },
    );

    const output = `${stdout}${stderr}`;
    expect(output).toContain('20240102.json');
    expect(output).toContain('20240103.json');
    expect(output).toMatch(/Image generation finished with failures.*failed: 2/s);
    expect(code).toBe(1);
    expect(fs.existsSync(path.join(outputDir, 'social', '.image-settings-hash'))).toBe(false);
  }, 65000);
});

describe('regenerate-all-words bulk run', () => {
  it('processes every word, then exits 1 when any failed', async () => {
    // The tool resolves data/words from its cwd, so a temp cwd isolates it. The
    // temp tree has no tools/fonts: a non-image tool must not load image fonts.
    const yearDir = path.join(ctx.tempDir, 'data', 'words', '2024');
    fs.mkdirSync(yearDir, { recursive: true });
    fs.writeFileSync(path.join(yearDir, '20240101.json'), JSON.stringify({ word: 'alpha' }));
    fs.writeFileSync(path.join(yearDir, '20240102.json'), JSON.stringify({ word: 'beta' }));

    // No adapter configured: every word fails before any network call.
    const { stdout, stderr, code } = await spawnTool(
      [path.join(TOOLS_DIR, 'regenerate-all-words.ts'), '--force', '--timeout', '1', '--batch-timeout', '1'],
      { env: { SOURCE_DIR: '', DICTIONARY_ADAPTER: '' }, cwd: ctx.tempDir, timeout: 30000 },
    );

    const output = `${stdout}${stderr}`;
    expect(output).toContain('alpha');
    expect(output).toContain('beta');
    expect(output).toMatch(/failed: 2/);
    expect(code).toBe(1);
  }, 35000);

  it('counts an unreadable word file as a failure', async () => {
    writeWordFiles({ '20240101.json': STORED_WORD, '20240102.json': '{ "word": ' });

    const { stdout, stderr, code } = await spawnTool(
      [path.join(TOOLS_DIR, 'regenerate-all-words.ts'), '--force', '--timeout', '1', '--batch-timeout', '1'],
      { env: { SOURCE_DIR: '', DICTIONARY_ADAPTER: '' }, cwd: ctx.tempDir, timeout: 30000 },
    );

    const output = `${stdout}${stderr}`;
    expect(output).toContain('20240102.json');
    expect(output).toMatch(/Regeneration complete.*failed: 2.*total: 2/s);
    expect(code).toBe(1);
  }, 35000);

  it('fails a dry run that could not read every word file', async () => {
    writeWordFiles({ '20240101.json': STORED_WORD, '20240102.json': '{ "word": ' });

    const { code } = await spawnTool(
      [path.join(TOOLS_DIR, 'regenerate-all-words.ts'), '--dry-run'],
      { env: { SOURCE_DIR: '' }, cwd: ctx.tempDir, timeout: 30000 },
    );

    expect(code).toBe(1);
  }, 35000);
});
