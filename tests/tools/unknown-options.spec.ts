/**
 * A mistyped option is the operator's input, not an application fault: each
 * tool must refuse a command line it cannot parse with exit 1, one warn-level
 * line naming the problem and a pointer to --help, instead of an uncaught
 * stack trace. Real subprocesses in an empty temp cwd, so nothing under data/
 * is read; the preloaded helper marks each warn and error line with its level.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { spawnTool } from '#tests/helpers/spawn.ts';

const LOG_LEVELS = pathToFileURL(path.join(process.cwd(), 'tests', 'helpers', 'log-levels.ts')).href;
const tool = (name: string): string => path.join(process.cwd(), 'tools', `${name}.ts`);

const ctx = { tempDir: '' };

beforeEach(() => {
  ctx.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wotd-unknown-options-'));
});

afterEach(() => {
  fs.rmSync(ctx.tempDir, { recursive: true, force: true });
});

describe('a command line a tool cannot parse', () => {
  it.each([
    ['add-word', ['alpha', '--batchsize=5'], '--batchsize'],
    ['generate-images', ['--batchsize=5'], '--batchsize'],
    ['regenerate-all-words', ['--batchsize=5'], '--batchsize'],
    ['generate-images', ['--word'], '--word'],
  ])('%s refuses %j at warn with a --help hint', async (name, args, option) => {
    const { code, stderr } = await spawnTool(['--import', LOG_LEVELS, tool(name), ...args], {
      env: { SOURCE_DIR: '', DICTIONARY_ADAPTER: '' },
      cwd: ctx.tempDir,
    });
    const lines = stderr.trim().split('\n');

    expect(code).toBe(1);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^\[warn\] /);
    expect(lines[0]).toContain(option);
    expect(lines[0]).toContain('--help');
  });
});
