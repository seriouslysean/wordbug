/**
 * Architecture tests for npm scripts, in package.json and wherever a command
 * is written down for someone to run.
 *
 * `npm run <script> --flag` hands the flag to npm, not to the script; only
 * arguments after a bare `--` reach the tool. A script that forgets the
 * separator silently runs the default invocation instead, and so does a
 * documented example copied as written.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = process.cwd();
const packageData: unknown = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
const scripts = typeof packageData === 'object' && packageData !== null
  && 'scripts' in packageData && typeof packageData.scripts === 'object' && packageData.scripts !== null
  ? Object.fromEntries(Object.entries(packageData.scripts).filter((entry): entry is [string, string] =>
      typeof entry[1] === 'string'))
  : {};

// Where commands are taught: tool help text, docs, agent guidance, workflows.
const COMMAND_SOURCES = [
  'AGENTS.md',
  ...['tools', 'docs', '.github', '.agents'].flatMap(dir =>
    fs.globSync(`${dir}/**/*.{ts,md,yml}`, { cwd: ROOT })),
];

// A command runs until the shell or the surrounding prose takes over.
const NPM_RUN = /npm run ([\w:-]+)(.*?)(?=`|#|;|\||&&|\)|$)/g;
const FLAG = /^--?[A-Za-z]/;

/**
 * Finds every `npm run <script> ...` in the text whose first dash-prefixed
 * argument is not preceded by a bare `--`.
 */
const findSwallowedFlags = (text: string): string[] => text.split('\n').flatMap((line, index) =>
  [...line.matchAll(NPM_RUN)]
    .filter(([, , tail = '']) => {
      const firstDash = tail.trim().split(/\s+/).find(arg => arg === '--' || FLAG.test(arg));
      return firstDash !== undefined && firstDash !== '--';
    })
    .map(([command]) => `${index + 1}: ${command.trim()}`));

describe('Architecture: npm scripts', () => {
  it('nested npm run calls pass flags after a -- separator', () => {
    const swallowed = Object.entries(scripts)
      .filter(([, command]) => findSwallowedFlags(command).length > 0)
      .map(([name]) => name);

    expect(swallowed).toEqual([]);
  });

  it('scans the files that teach commands', () => {
    expect(COMMAND_SOURCES).toEqual(expect.arrayContaining([
      'tools/add-word.ts',
      'tools/generate-images.ts',
      'docs/technical.md',
      'docs/README.md',
      '.github/workflows/add-word.yml',
      '.agents/skills/validate/SKILL.md',
    ]));
  });

  it('documented npm run examples pass flags after a -- separator', () => {
    const swallowed = COMMAND_SOURCES.flatMap(file =>
      findSwallowedFlags(fs.readFileSync(path.join(ROOT, file), 'utf-8')).map(found => `${file}:${found}`));

    expect(swallowed).toEqual([]);
  });

  it.each([
    ['a flag straight after the script', 'npm run tool:generate-images --words'],
    ['a flag after positional arguments', 'npm run tool:add-word "Japan" --preserve-case'],
    ['a short flag', 'npm run tool:add-word Japan -p'],
    ['a flag inside inline code', 'Run `npm run tool:regenerate-all-words --force` per site.'],
    ['a flag after an ampersand in a quoted word', 'npm run tool:add-word "PB&J" "20250101" --preserve-case'],
    ['the second command on a line', 'Both `npm run build` and `npm run tool:add-word --help` work.'],
  ])('flags %s', (_, text) => {
    expect(findSwallowedFlags(text)).toHaveLength(1);
  });

  it.each([
    ['flags after the separator', 'npm run tool:generate-images -- --words'],
    ['the separator after positional arguments', 'npm run tool:local tools/add-word.ts Japan -- --preserve-case'],
    ['positional arguments only', 'npm run tool:add-word "ephemeral" "20240116"'],
    ['a flag that belongs to the next command', 'npm run build && npx playwright test --headed'],
    ['a flag outside the inline code', 'Use `npm run build` - never --force anything.'],
    ['a trailing comment', 'npm run lint        # 0 errors --strict'],
  ])('accepts %s', (_, text) => {
    expect(findSwallowedFlags(text)).toEqual([]);
  });

  it('every node tools/*.ts script points at a file that exists', () => {
    const missing = Object.entries(scripts)
      .flatMap(([name, command]) => [...command.matchAll(/node (tools\/\S+\.ts)/g)]
        .flatMap(match => match[1] ? [{ name, file: match[1] }] : []))
      .filter(({ file }) => !fs.existsSync(path.join(ROOT, file)))
      .map(({ name }) => name);

    expect(missing).toEqual([]);
  });

  it('tool:generate-all-images runs the generator exactly once', () => {
    // The default invocation already covers every word and every generic page.
    expect(scripts['tool:generate-all-images']).toBe('node tools/generate-images.ts');
  });
});
