import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { spawnTool } from '#tests/helpers/spawn.ts';

const TOOL = path.join(import.meta.dirname, '..', '..', 'tools', 'normalize-word-data.ts');
const ctx = { root: '', file: '' };

beforeEach(() => {
  ctx.root = fs.mkdtempSync(path.join(os.tmpdir(), 'wotd-normalize-'));
  const words = path.join(ctx.root, 'data', 'words', '2025');
  fs.mkdirSync(words, { recursive: true });
  ctx.file = path.join(words, '20250101.json');
  fs.writeFileSync(ctx.file, `${JSON.stringify({
    word: 'rest',
    date: '20250101',
    adapter: 'wordnik',
    data: [{ partOfSpeech: 'noun', text: 'a <xref>rest</xref>', examples: [] }],
  }, null, 4)}\n`);
});

afterEach(() => {
  fs.rmSync(ctx.root, { recursive: true, force: true });
});

const run = (...args: string[]) => spawnTool([TOOL, ...args], {
  cwd: ctx.root,
  env: { SOURCE_DIR: '', CI: 'true' },
});

describe('normalize-word-data CLI', () => {
  it('previews without writing, writes once, then reports an unchanged corpus', async () => {
    const original = fs.readFileSync(ctx.file, 'utf8');
    const preview = await run('--dry-run');
    expect(preview.code).toBe(0);
    expect(preview.stdout).toContain('Would normalize word file');
    expect(fs.readFileSync(ctx.file, 'utf8')).toBe(original);

    const write = await run();
    expect(write.code).toBe(0);
    expect(write.stdout).toContain('Normalized word file');
    expect(fs.readFileSync(ctx.file, 'utf8')).not.toBe(original);

    const second = await run('--dry-run');
    expect(second.code).toBe(0);
    expect(second.stdout).toContain('changed: 0');
  });

  it('reports malformed markup and leaves the file untouched', async () => {
    const malformed = fs.readFileSync(ctx.file, 'utf8').replace('</xref>', '');
    fs.writeFileSync(ctx.file, malformed);

    const result = await run();

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Malformed definition markup');
    expect(fs.readFileSync(ctx.file, 'utf8')).toBe(malformed);
  });
});
