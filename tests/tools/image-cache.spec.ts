/**
 * Image cache invalidation is settled once per run: a settings change
 * regenerates every existing image, a change to what one card shows
 * regenerates that card, and the marker that certifies the corpus only
 * advances after a complete run with no failures. Real subprocesses writing
 * to a temp dir; nothing under public/ is touched.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { spawnTool } from '#tests/helpers/spawn.ts';

const ALL_GENERATED = /(word|generic) generation complete \{ total: (\d+), generated: \2, skipped: 0, errors: 0 \}/g;
const FONTS_DIR = path.join(process.cwd(), 'tools', 'fonts', 'liberation-sans');
const FONTS = ['LiberationSans-Regular.ttf', 'LiberationSans-Bold.ttf'];

const ctx = { outputDir: '', markerPath: '' };

// console.info wraps a long label onto its own line
const generatedLabels = (stdout: string): string[] =>
  [...stdout.matchAll(/Generated (?:word|generic) image \{\s+label: '(.*)'\s+\}/g)]
    .flatMap(match => match[1] ? [match[1]] : []);

// A three-word corpus under a temp cwd (tools resolve data/ and tools/fonts/
// from it). "t" is in all three words, so it is the most common letter.
const CORPUS = { '20240101.json': 'tee', '20240102.json': 'ten', '20240103.json': 'cot' };

const writeWord = (file: string, word: string): void => {
  const yearDir = path.join(ctx.outputDir, 'data', 'words', '2024');
  fs.mkdirSync(yearDir, { recursive: true });
  fs.writeFileSync(path.join(yearDir, file), JSON.stringify({
    word,
    date: file.replace('.json', ''),
    adapter: 'wordnik',
    preserveCase: word !== word.toLowerCase(),
    data: [{ text: 'a word', partOfSpeech: 'noun' }],
  }));
};

const setUpCorpus = () => {
  const fontsDir = path.join(ctx.outputDir, 'tools', 'fonts', 'liberation-sans');
  fs.mkdirSync(fontsDir, { recursive: true });
  for (const font of FONTS) {
    fs.copyFileSync(path.join(FONTS_DIR, font), path.join(fontsDir, font));
  }
  for (const [file, word] of Object.entries(CORPUS)) {
    writeWord(file, word);
  }
};

const runCorpus = () => spawnTool(
  [path.join(process.cwd(), 'tools', 'generate-images.ts')],
  { env: { SOURCE_DIR: '', IMAGES_OUTPUT_DIR: path.join(ctx.outputDir, 'images') }, cwd: ctx.outputDir, timeout: 60000 },
);

const corpusMarkerPath = () => path.join(ctx.outputDir, 'images', 'social', '.image-settings-hash');

const run = (args: string[], colorPrimary: string) => spawnTool(
  ['tools/generate-images.ts', ...args],
  { env: { SOURCE_DIR: 'demo', IMAGES_OUTPUT_DIR: ctx.outputDir, COLOR_PRIMARY: colorPrimary }, timeout: 60000 },
);

const readMarker = () => fs.readFileSync(ctx.markerPath, 'utf-8');

beforeEach(() => {
  ctx.outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wotd-image-cache-'));
  ctx.markerPath = path.join(ctx.outputDir, 'social', '.image-settings-hash');
});

afterEach(() => {
  fs.rmSync(ctx.outputDir, { recursive: true, force: true });
});

describe('generate-images cache invalidation', () => {
  it('regenerates every existing image after a settings change, then skips them all', async () => {
    const first = await run([], '#111111');
    expect(first.code).toBe(0);
    const firstMarker = readMarker();

    const changed = await run([], '#222222');
    expect(changed.code).toBe(0);
    expect(changed.stdout.match(ALL_GENERATED)).toHaveLength(2);
    expect(readMarker()).not.toBe(firstMarker);

    const unchanged = await run([], '#222222');
    expect(unchanged.code).toBe(0);
    expect(unchanged.stdout).not.toMatch(/generated: [1-9]/);
  }, 120000);

  it('does not advance the marker when the run has failures', async () => {
    await run([], '#111111');
    const firstMarker = readMarker();

    // A regular file where the pages directory belongs fails every generic job
    // after the word jobs have already succeeded.
    const pagesDir = path.join(ctx.outputDir, 'social', 'pages');
    fs.rmSync(pagesDir, { recursive: true });
    fs.writeFileSync(pagesDir, '');

    const { code } = await run([], '#222222');
    expect(code).toBe(1);
    expect(readMarker()).toBe(firstMarker);
  }, 120000);

  it('never certifies the corpus from a partial run', async () => {
    const single = await run(['--page', '/stats'], '#111111');
    expect(single.code).toBe(0);
    expect(fs.existsSync(ctx.markerPath)).toBe(false);

    const generic = await run(['--generic'], '#111111');
    expect(generic.code).toBe(0);
    expect(fs.existsSync(ctx.markerPath)).toBe(false);
  }, 120000);

  it('certifies the corpus when --words and --generic together cover everything', async () => {
    const covered = await run(['--words', '--generic'], '#111111');
    expect(covered.code).toBe(0);
    expect(covered.stdout.match(ALL_GENERATED)).toHaveLength(2);
    expect(fs.existsSync(ctx.markerPath)).toBe(true);

    const unchanged = await run([], '#111111');
    expect(unchanged.code).toBe(0);
    expect(unchanged.stdout).not.toMatch(/generated: [1-9]/);
  }, 120000);
});

describe('generate-images per-card inputs', () => {
  beforeEach(setUpCorpus);

  it('regenerates only the page card whose corpus-derived title changed', async () => {
    const first = await runCorpus();
    expect(first.code).toBe(0);

    // "cot" -> "coe": "e" is now in all three words and "t" in two
    writeWord('20240103.json', 'coe');
    const changed = await runCorpus();

    expect(changed.code).toBe(0);
    expect(generatedLabels(changed.stdout)).toEqual([
      'coe (20240103)',
      'Words with "E" (Most Common Letter) (/stats/most-common-letter)',
    ]);
    const { cards } = JSON.parse(fs.readFileSync(corpusMarkerPath(), 'utf-8'));
    expect(Object.keys(cards)).toContain('social/2024/20240103-coe.png');
    expect(Object.keys(cards)).not.toContain('social/2024/20240103-cot.png');
  }, 120000);

  it('regenerates a word card whose case changed although its file name did not', async () => {
    await runCorpus();

    writeWord('20240102.json', 'Ten');
    const changed = await runCorpus();

    expect(changed.code).toBe(0);
    expect(generatedLabels(changed.stdout)).toEqual(['Ten (20240102)']);
  }, 120000);

  it('regenerates nothing when nothing changed', async () => {
    await runCorpus();

    const unchanged = await runCorpus();

    expect(unchanged.code).toBe(0);
    expect(generatedLabels(unchanged.stdout)).toEqual([]);
  }, 120000);

  it('regenerates everything once when the marker is the bare fingerprint older runs wrote', async () => {
    await runCorpus();
    const { settings } = JSON.parse(fs.readFileSync(corpusMarkerPath(), 'utf-8'));
    fs.writeFileSync(corpusMarkerPath(), `${settings}\n`);

    const upgraded = await runCorpus();
    expect(upgraded.code).toBe(0);
    expect(upgraded.stdout.match(ALL_GENERATED)).toHaveLength(2);

    const again = await runCorpus();
    expect(again.code).toBe(0);
    expect(generatedLabels(again.stdout)).toEqual([]);
  }, 120000);
});
