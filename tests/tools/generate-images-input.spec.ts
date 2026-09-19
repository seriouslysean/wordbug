/**
 * A --word or --page that names nothing in the data is the operator's typo,
 * not an application fault: generate-images must refuse it with exit 1 at a
 * level the CLI logger does not forward to Sentry (only `error` is). Word data
 * that cannot be read is a fault in the site's setup, not a typo, and is
 * reported at error. Real subprocesses against the demo data or a temp data
 * tree, writing to a temp dir; the preloaded helper marks each warn and error
 * line with its level.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { spawnTool } from '#tests/helpers/spawn.ts';

const LOG_LEVELS = pathToFileURL(path.join(process.cwd(), 'tests', 'helpers', 'log-levels.ts')).href;

const ctx = { outputDir: '' };

beforeEach(() => {
  ctx.outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wotd-generate-images-input-'));
});

afterEach(() => {
  fs.rmSync(ctx.outputDir, { recursive: true, force: true });
});

describe('generate-images input errors', () => {
  it.each([
    ['a word that is not in the data', ['--word', 'notaword'], 'Word not found in data files'],
    ['a page that does not exist', ['--page', '/not-a-page'], 'Page not found in available pages'],
  ])('refuses %s without reporting an error', async (_, args, message) => {
    const { code, stderr } = await spawnTool(
      ['--import', LOG_LEVELS, 'tools/generate-images.ts', ...args],
      { env: { SOURCE_DIR: 'demo', IMAGES_OUTPUT_DIR: ctx.outputDir }, timeout: 30000 },
    );

    expect(code).toBe(1);
    expect(stderr).toContain(`[warn] ${message}`);
    expect(stderr).not.toContain('[error]');
  }, 35000);
});

describe('generate-images without word data', () => {
  // A mistyped SOURCE_DIR: no words directory under data/
  const missingSource = { SOURCE_DIR: 'not-a-source-dir' };

  it('reports the missing words directory at error for --word', async () => {
    const { code, stderr } = await spawnTool(
      ['--import', LOG_LEVELS, 'tools/generate-images.ts', '--word', 'amblypygi'],
      { env: { ...missingSource, IMAGES_OUTPUT_DIR: ctx.outputDir }, timeout: 30000 },
    );

    expect(code).toBe(1);
    expect(stderr).toContain('[error] Word directory does not exist');
    // The word may be in data that could not be read, so it is not called missing
    expect(stderr).not.toContain('Word not found in data files');
  }, 35000);

  it('fails --page rather than draw its card from a partial corpus', async () => {
    const { code, stderr } = await spawnTool(
      ['--import', LOG_LEVELS, 'tools/generate-images.ts', '--page', '/stats'],
      { env: { ...missingSource, IMAGES_OUTPUT_DIR: ctx.outputDir }, timeout: 30000 },
    );

    expect(code).toBe(1);
    expect(stderr).toContain('[error] Word directory does not exist');
    expect(fs.readdirSync(ctx.outputDir)).toEqual([]);
  }, 35000);
});

describe('generate-images with a year directory but no word files', () => {
  // What a failed first add-word leaves: it makes the year directory before
  // the fetch. The tools resolve data/ and their fonts from the cwd, so the
  // fonts are copied into the temp tree beside it.
  const imagesDir = () => path.join(ctx.outputDir, 'images');
  const generateImages = (args: string[]) => {
    const fontsDir = path.join(ctx.outputDir, 'tools', 'fonts', 'liberation-sans');
    fs.mkdirSync(fontsDir, { recursive: true });
    for (const font of ['LiberationSans-Regular.ttf', 'LiberationSans-Bold.ttf']) {
      fs.copyFileSync(path.join(process.cwd(), 'tools', 'fonts', 'liberation-sans', font), path.join(fontsDir, font));
    }
    fs.mkdirSync(path.join(ctx.outputDir, 'data', 'words', '2025'), { recursive: true });
    return spawnTool(
      ['--import', LOG_LEVELS, path.join(process.cwd(), 'tools', 'generate-images.ts'), ...args],
      { env: { SOURCE_DIR: '', IMAGES_OUTPUT_DIR: imagesDir() }, cwd: ctx.outputDir, timeout: 60000 },
    );
  };

  it('fails a full run at error and does not certify the corpus', async () => {
    const { code, stderr } = await generateImages([]);

    expect(code).toBe(1);
    expect(stderr).toContain('[error] No word files found');
    expect(fs.existsSync(path.join(imagesDir(), 'social', '.image-settings-hash'))).toBe(false);
  }, 65000);

  it('reports the empty corpus at error for --word, not a missing word', async () => {
    const { code, stderr } = await generateImages(['--word', 'amblypygi']);

    expect(code).toBe(1);
    expect(stderr).toContain('[error] No word files found');
    expect(stderr).not.toContain('Word not found in data files');
  }, 65000);

  it('fails --page at error without drawing its card', async () => {
    const { code, stderr } = await generateImages(['--page', '/stats']);

    expect(code).toBe(1);
    expect(stderr).toContain('[error] No word files found');
    expect(fs.existsSync(imagesDir())).toBe(false);
  }, 65000);
});
