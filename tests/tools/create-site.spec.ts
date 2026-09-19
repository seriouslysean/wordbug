/**
 * tools/create-site.ts run as a real process from a temp dir, the way a
 * site owner runs it, with local seed files and no network.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { load } from 'js-yaml';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnTool, type SpawnToolResult } from '#tests/helpers/spawn.ts';

const ROOT = process.cwd();
const TOOL = path.join(ROOT, 'tools', 'create-site.ts');
const SHA = '0123456789abcdef0123456789abcdef01234567';

// Every file a new site gets, as docs/technical.md and the README list them
const SITE_FILES = [
  '.env.example',
  '.github/dependabot.yml',
  '.github/workflows/add-word.yml',
  '.github/workflows/deploy.yml',
  '.gitignore',
  'README.md',
  'data/words/2026/20260918.json',
  'public/favicon.svg',
];

// Not what JSON.stringify would write, so a re-serialized copy shows
const SEED = `{"word": "café & crème",\t"date": "20260918", "adapter": "wiktionary",
  "data": [{"id": "café & crème", "partOfSpeech": "noun", "text": "A coffee.", "attributionText": "Wiktionary", "sourceDictionary": "wiktionary", "sourceUrl": "https://en.wiktionary.org/wiki/caf%C3%A9"}]}`;

const ctx: { dir: string } = { dir: '' };

const run = (...args: string[]): Promise<SpawnToolResult> => spawnTool([TOOL, ...args], { cwd: ctx.dir });

const write = (file: string, content: string): string => {
  const target = path.join(ctx.dir, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  return target;
};

// Every file under a directory, relative to it
const files = (dir: string): string[] => fs.readdirSync(path.join(ctx.dir, dir), { recursive: true, withFileTypes: true })
  .filter(entry => entry.isFile())
  .map(entry => path.relative(path.join(ctx.dir, dir), path.join(entry.parentPath, entry.name)))
  .toSorted();

const documentedCaller = (workflow: string): string[] => {
  const docs = fs.readFileSync(path.join(ROOT, 'docs/technical.md'), 'utf-8');
  const blocks = [...docs.matchAll(/```yaml\n([\s\S]*?)```/g)]
    .flatMap(match => match[1] ? [match[1]] : []);
  return blocks.filter(block => block.includes(`/.github/workflows/${workflow}@vX.Y.Z`));
};

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an object`);
  }
  return Object.fromEntries(Object.entries(value));
};

const field = (value: unknown, key: string, label: string): unknown => {
  const object = record(value, label);
  if (!(key in object)) {
    throw new Error(`Expected ${label} to contain ${key}`);
  }
  return object[key];
};

const stringField = (value: unknown, key: string, label: string): string => {
  const result = field(value, key, label);
  if (typeof result !== 'string') {
    throw new Error(`Expected ${label}.${key} to be a string`);
  }
  return result;
};

const arrayField = (value: unknown, key: string, label: string): unknown[] => {
  const result = field(value, key, label);
  if (!Array.isArray(result)) {
    throw new Error(`Expected ${label}.${key} to be an array`);
  }
  return result;
};

beforeEach(() => {
  ctx.dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'wotd-create-site-')));
  write('seed.json', SEED);
});

afterEach(() => {
  fs.rmSync(ctx.dir, { recursive: true, force: true });
});

describe('create-site', { timeout: 20000 }, () => {
  it('creates only the documented site files', async () => {
    const result = await run('site', '--engine-ref', 'v3.23.0', '--seed-file', 'seed.json');

    expect(result.code).toBe(0);
    expect(files('site')).toEqual(SITE_FILES);
    expect(fs.readFileSync(path.join(ctx.dir, 'site/.env.example'))).toEqual(fs.readFileSync(path.join(ROOT, '.env.example')));
    expect(fs.readFileSync(path.join(ctx.dir, 'site/public/favicon.svg'))).toEqual(fs.readFileSync(path.join(ROOT, 'public/favicon.svg')));
    expect(fs.readFileSync(path.join(ctx.dir, 'site/.gitignore'), 'utf-8')).toMatch(/^\.env$/m);
  });

  it.each([
    ['a release tag', 'v3.23.0'],
    ['a full commit SHA', SHA],
  ])('pins both callers to %s, as the docs show them', async (_, ref) => {
    const result = await run('site', '--engine-ref', ref, '--seed-file', 'seed.json');

    expect(result.code).toBe(0);
    const deploy = fs.readFileSync(path.join(ctx.dir, 'site/.github/workflows/deploy.yml'), 'utf-8');
    const addWord = fs.readFileSync(path.join(ctx.dir, 'site/.github/workflows/add-word.yml'), 'utf-8');
    expect(stringField(field(field(load(deploy), 'jobs', 'workflow'), 'deploy', 'jobs'), 'uses', 'deploy job'))
      .toBe(`seriouslysean/occasional-wotd/.github/workflows/site-deploy.yml@${ref}`);
    expect(stringField(field(field(load(addWord), 'jobs', 'workflow'), 'add-word', 'jobs'), 'uses', 'add-word job'))
      .toBe(`seriouslysean/occasional-wotd/.github/workflows/site-add-word.yml@${ref}`);
    expect(documentedCaller('site-deploy.yml')).toEqual([deploy.replaceAll(`@${ref}`, '@vX.Y.Z')]);
    expect(documentedCaller('site-add-word.yml')).toEqual([addWord.replaceAll(`@${ref}`, '@vX.Y.Z')]);
  });

  it('copies the validated seed without changing its contents', async () => {
    const result = await run('site', '--engine-ref', 'v3.23.0', '--seed-file', 'seed.json');

    expect(result.code).toBe(0);
    expect(fs.readFileSync(path.join(ctx.dir, 'site/data/words/2026/20260918.json'), 'utf-8')).toBe(SEED);
  });

  it('groups engine updates for Dependabot', async () => {
    await run('site', '--engine-ref', 'v3.23.0', '--seed-file', 'seed.json');

    const config = load(fs.readFileSync(path.join(ctx.dir, 'site/.github/dependabot.yml'), 'utf-8'));
    expect(arrayField(config, 'updates', 'Dependabot config')).toEqual([expect.objectContaining({
      'package-ecosystem': 'github-actions',
      directory: '/',
      groups: { engine: { patterns: ['seriouslysean/occasional-wotd*'] } },
    })]);
  });

  // Refs that move, and the forms that are not a ref at all
  it.each([
    ['a moving major tag', 'v3'],
    ['a partial version', 'v3.23'],
    ['a branch', 'main'],
    ['a full tag ref', 'refs/tags/v3.23.0'],
    ['a short SHA', SHA.slice(0, 12)],
    ['an upper-case SHA', SHA.toUpperCase()],
    ['a whole uses value', 'seriouslysean/occasional-wotd/.github/workflows/site-deploy.yml@v3.23.0'],
  ])('refuses %s as the engine ref before writing', async (_, ref) => {
    const result = await run('site', '--engine-ref', ref, '--seed-file', 'seed.json');

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('--engine-ref must be');
    expect(fs.existsSync(path.join(ctx.dir, 'site'))).toBe(false);
  });

  it.each([
    ['a file that is not JSON', 'not json', 'JSON'],
    ['a word file without its definitions', '{"word": "x", "date": "20260918", "adapter": "wiktionary"}', 'Invalid word data'],
    ['a date that is not YYYYMMDD', SEED.replace('20260918', '2026-09-18'), 'date must be YYYYMMDD'],
    ['a date that is not a real day', SEED.replace('20260918', '20260231'), 'date must be YYYYMMDD'],
    ['a date that climbs out of the site', SEED.replace('20260918', '../../x'), 'date must be YYYYMMDD'],
  ])('refuses %s as the seed before writing', async (_, content, message) => {
    write('bad.json', content);

    const result = await run('site', '--engine-ref', 'v3.23.0', '--seed-file', 'bad.json');

    expect(result.code).toBe(1);
    expect(result.stderr).toContain(message);
    expect(fs.readdirSync(ctx.dir).toSorted()).toEqual(['bad.json', 'seed.json']);
  });

  it('refuses a missing seed before writing', async () => {
    const result = await run('site', '--engine-ref', 'v3.23.0', '--seed-file', 'missing.json');

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('ENOENT');
    expect(fs.existsSync(path.join(ctx.dir, 'site'))).toBe(false);
  });

  it('refuses a nonempty target without changing it', async () => {
    write('site/README.md', 'mine\n');
    write('site/data/words/2026/20260918.json', 'mine\n');

    const result = await run('site', '--engine-ref', 'v3.23.0', '--seed-file', 'seed.json');

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('must not exist or be an empty directory');
    expect(files('site')).toEqual(['README.md', 'data/words/2026/20260918.json']);
    expect(fs.readFileSync(path.join(ctx.dir, 'site/README.md'), 'utf-8')).toBe('mine\n');
  });

  it('refuses a target that is a file', async () => {
    write('site', 'a file\n');

    const result = await run('site', '--engine-ref', 'v3.23.0', '--seed-file', 'seed.json');

    expect(result.code).toBe(1);
    expect(fs.readFileSync(path.join(ctx.dir, 'site'), 'utf-8')).toBe('a file\n');
  });

  it('fills an empty directory', async () => {
    fs.mkdirSync(path.join(ctx.dir, 'site'));

    const result = await run('site', '--engine-ref', 'v3.23.0', '--seed-file', 'seed.json');

    expect(result.code).toBe(0);
    expect(files('site')).toEqual(SITE_FILES);
  });

  it('supports paths containing spaces', async () => {
    write('my seeds/first word.json', SEED);

    const result = await run('new sites/word bee', '--engine-ref', 'v3.23.0', '--seed-file', 'my seeds/first word.json');

    expect(result.code).toBe(0);
    expect(files('new sites/word bee')).toEqual(SITE_FILES);
  });

  it.each([
    ['alone', ['--help']],
    ['with every argument', ['site', '--engine-ref', 'v3.23.0', '--seed-file', 'seed.json', '-h']],
  ])('help %s performs no writes', async (_, args) => {
    const result = await run(...args);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('npm run tool:create-site -- <directory>');
    expect(fs.readdirSync(ctx.dir)).toEqual(['seed.json']);
  });

  it.each([
    ['no arguments', []],
    ['no directory', ['--engine-ref', 'v3.23.0', '--seed-file', 'seed.json']],
    ['two directories', ['one', 'two', '--engine-ref', 'v3.23.0', '--seed-file', 'seed.json']],
    ['no engine ref', ['site', '--seed-file', 'seed.json']],
    ['no seed', ['site', '--engine-ref', 'v3.23.0']],
    ['an unknown option', ['site', '--engine-ref', 'v3.23.0', '--seed-file', 'seed.json', '--force']],
  ])('refuses %s', async (_, args) => {
    const result = await run(...args);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Create site failed');
    expect(fs.readdirSync(ctx.dir)).toEqual(['seed.json']);
  });
});
