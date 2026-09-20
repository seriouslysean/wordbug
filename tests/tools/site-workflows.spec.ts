/**
 * The shell steps of the reusable site workflows, run the way GitHub runs
 * them: bash with -e, the step's env and working-directory, and outputs
 * written to $GITHUB_OUTPUT. Each step comes straight out of the checked-in
 * YAML, and expression values in its env come from the context a test
 * supplies, so a renamed input or a changed script fails here rather than in
 * a live run. Fixture checkouts live in a temp dir.
 */

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { load } from 'js-yaml';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

interface StepResult {
  code: number | null;
  output: string;
  outputs: string;
}

interface Context {
  dir: string;
}

interface AddWordOptions {
  word: string;
  date?: string;
  overwrite?: string;
  preserveCase?: string;
  beforeCommit?: () => void;
}

interface AddWordResult {
  added: StepResult;
  outputs: Record<string, string>;
  committed?: StepResult;
  engineBefore?: Record<string, string>;
  engineAfter?: Record<string, string>;
}

type YamlObject = Record<string, unknown>;

const ROOT = process.cwd();

const objectValue = (value: unknown, label: string): YamlObject => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an object`);
  }
  return Object.fromEntries(Object.entries(value));
};

const arrayValue = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an array`);
  }
  return value;
};

const field = (object: YamlObject, key: string, label: string): unknown => {
  if (!(key in object)) {
    throw new Error(`Expected ${label} to contain ${key}`);
  }
  return object[key];
};

const requiredString = (object: YamlObject, key: string, label: string): string => {
  const value = field(object, key, label);
  if (typeof value !== 'string') {
    throw new Error(`Expected ${label}.${key} to be a string`);
  }
  return value;
};

const optionalString = (object: YamlObject, key: string): string | undefined => {
  const value = object[key];
  return typeof value === 'string' ? value : undefined;
};

const nestedObject = (object: YamlObject, key: string, label: string): YamlObject =>
  objectValue(field(object, key, label), `${label}.${key}`);

const workflow = (file: string): YamlObject =>
  objectValue(load(fs.readFileSync(path.join(ROOT, '.github/workflows', file), 'utf-8')), file);

const workflowJobs = (doc: YamlObject): YamlObject => nestedObject(doc, 'jobs', 'workflow');

const jobSteps = (job: YamlObject): YamlObject[] =>
  arrayValue(field(job, 'steps', 'job'), 'job steps').map((step, index) => objectValue(step, `job step ${index}`));

const workflowSteps = (doc: YamlObject): YamlObject[] =>
  Object.values(workflowJobs(doc)).flatMap(job => jobSteps(objectValue(job, 'workflow job')));

const objectOrEmpty = (object: YamlObject, key: string): YamlObject => {
  const value = object[key];
  return value === undefined ? {} : objectValue(value, `${key} value`);
};

const SHA = '0123456789abcdef0123456789abcdef01234567';

const ctx: Context = { dir: '' };

// A whole-value ${{ expression }} becomes the context entry of that name
const evaluate = (value: unknown, context: Record<string, string>): string => {
  const text = String(value);
  const expression = text.match(/^\$\{\{\s*(.+?)\s*\}\}$/)?.[1];
  if (expression === undefined) {
    if (text.includes('${{')) {
      throw new Error(`Unsupported expression in ${text}`);
    }
    return text;
  }
  if (!(expression in context)) {
    throw new Error(`The test supplies no ${expression}`);
  }
  return context[expression] ?? '';
};

/**
 * Runs one named step of a workflow in ctx.dir, the runner's workspace.
 * env stands in for what earlier steps exported through $GITHUB_ENV.
 */
const runStep = (
  file: string,
  name: string,
  options: { env?: Record<string, string>; context?: Record<string, string> } = {},
): Promise<StepResult> => {
  const doc = workflow(file);
  const found = Object.values(workflowJobs(doc))
    .flatMap(job => {
      const jobObject = objectValue(job, 'workflow job');
      return jobSteps(jobObject).map(step => ({ job: jobObject, step }));
    })
    .find(({ step }) => optionalString(step, 'name') === name);
  if (!found) {
    throw new Error(`${file} has no step named ${name}`);
  }
  const { job, step } = found;
  const stepRun = requiredString(step, 'run', `${file} ${name}`);
  // Workflows keep expressions out of scripts, so an input is always data
  if (stepRun.includes('${{')) {
    throw new Error(`${file}: ${name} expands an expression inside its script`);
  }

  const declared = {
    ...objectOrEmpty(doc, 'env'),
    ...objectOrEmpty(job, 'env'),
    ...objectOrEmpty(step, 'env'),
  };
  const output = path.join(ctx.dir, 'github_output');
  fs.writeFileSync(output, '');

  const shell = ['--noprofile', '--norc', '-e', ...(optionalString(step, 'shell') === 'bash' ? ['-o', 'pipefail'] : [])];
  const { promise, resolve, reject } = Promise.withResolvers<StepResult>();
  const proc = spawn('bash', [...shell, '-c', stepRun], {
    cwd: path.join(ctx.dir, optionalString(step, 'working-directory') ?? '.'),
    env: {
      PATH: process.env.PATH ?? '',
      HOME: ctx.dir,
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
      GITHUB_OUTPUT: output,
      ...options.env,
      ...Object.fromEntries(Object.entries(declared).map(([key, value]) => [
        key,
        evaluate(value, options.context ?? {}),
      ])),
    },
  });
  const chunks: string[] = [];
  proc.stdout.on('data', (data: Buffer | string) => chunks.push(data.toString()));
  proc.stderr.on('data', (data: Buffer | string) => chunks.push(data.toString()));
  proc.on('error', reject);
  proc.on('close', code => resolve({ code, output: chunks.join(''), outputs: fs.readFileSync(output, 'utf-8') }));
  return promise;
};

// name=value lines a step wrote to $GITHUB_OUTPUT
const parseOutputs = (text: string): Record<string, string> => Object.fromEntries(text.split('\n').filter(Boolean)
  .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));

const write = (file: string, content: string): void => {
  const target = path.join(ctx.dir, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};

// Every file under a directory with its content, for before and after checks
const snapshot = (dir: string): Record<string, string> => Object.fromEntries(
  fs.readdirSync(path.join(ctx.dir, dir), { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.join(entry.parentPath, entry.name))
    .map(file => [path.relative(path.join(ctx.dir, dir), file), fs.readFileSync(file, 'utf-8')])
    .toSorted(([a = ''], [b = '']) => a.localeCompare(b)),
);

const git = (dir: string, ...args: string[]): string => String(execFileSync('git', args, {
  cwd: path.join(ctx.dir, dir),
  encoding: 'utf-8',
  stdio: 'pipe',
  env: {
    PATH: process.env.PATH ?? '',
    HOME: ctx.dir,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Fixture',
    GIT_AUTHOR_EMAIL: 'fixture@example.com',
    GIT_COMMITTER_NAME: 'Fixture',
    GIT_COMMITTER_EMAIL: 'fixture@example.com',
  },
})).trim();

const ENGINE_REPOSITORY = requiredString(nestedObject(workflow('site-deploy.yml'), 'env', 'workflow'), 'ENGINE_REPOSITORY', 'workflow env');
const BUILD_SECRETS: Record<string, string> = {
  GA_ENABLED: 'ga-enabled',
  GA_MEASUREMENT_ID: 'ga-measurement-id',
  SENTRY_AUTH_TOKEN: 'sentry-auth-token',
  SENTRY_DSN: 'sentry-dsn',
  SENTRY_ENABLED: 'sentry-enabled',
  SENTRY_ORG: 'sentry-org',
  SENTRY_PROJECT: 'sentry-project',
};
const ADD_WORD_SECRETS: Record<string, string> = {
  MERRIAM_WEBSTER_API_KEY: 'merriam-webster-api-key',
  SENTRY_DSN: 'sentry-dsn',
  SENTRY_ENABLED: 'sentry-enabled',
  WORDNIK_API_KEY: 'wordnik-api-key',
};

const repositorySecretBindings = (scope: Record<string, string>): YamlObject => Object.fromEntries(
  Object.keys(scope).map(name => [name, `\${{ secrets.${name} }}`]),
);

const actionSecretBindings = (scope: Record<string, string>): YamlObject => Object.fromEntries(
  Object.entries(scope).map(([name, input]) => [input, `\${{ secrets.${name} }}`]),
);

// A step that runs in site/ or names a path under it
const readsSite = (step: YamlObject): boolean => optionalString(step, 'working-directory') === 'site'
  || /(^|[\s"'])site\//m.test(optionalString(step, 'run') ?? '');

beforeEach(() => {
  ctx.dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'wotd-site-workflow-')));
});

afterEach(() => {
  fs.rmSync(ctx.dir, { recursive: true, force: true });
});

describe('site workflows', { timeout: 20000 }, () => {
  describe.each([
    ['site-deploy.yml', 'deploy.yml', BUILD_SECRETS],
    ['site-add-word.yml', 'add-word.yml', ADD_WORD_SECRETS],
  ])('%s secret scope', (file, caller, expected) => {
    it('declares, receives and forwards only the secrets this operation needs', () => {
      const reusable = workflow(file);
      const workflowCall = nestedObject(nestedObject(reusable, 'on', 'workflow trigger'), 'workflow_call', 'workflow call');
      expect(Object.keys(nestedObject(workflowCall, 'secrets', 'workflow call'))).toEqual(Object.keys(expected));

      const template = objectValue(load(fs.readFileSync(path.join(ROOT, 'tools/templates/site', caller), 'utf-8')), caller);
      const templateJob = Object.values(workflowJobs(template))[0];
      if (templateJob === undefined) {
        throw new Error(`${caller} has no job`);
      }
      expect(nestedObject(objectValue(templateJob, 'site caller job'), 'secrets', 'site caller job'))
        .toEqual(repositorySecretBindings(expected));

      const setup = workflowSteps(reusable).find(step => optionalString(step, 'name') === 'Setup environment variables');
      if (setup === undefined) {
        throw new Error(`${file} has no setup-env step`);
      }
      expect(nestedObject(setup, 'with', 'setup-env step')).toEqual({
        'vars-json': '${{ toJSON(vars) }}',
        ...actionSecretBindings(expected),
      });
    });
  });

  it('limits repository workflows and Build to their operation-specific secret scopes', () => {
    const buildSetup = workflowSteps(workflow('build.yml'))
      .find(step => optionalString(step, 'name') === 'Setup environment variables');
    if (buildSetup === undefined) {
      throw new Error('build.yml has no setup-env step');
    }
    expect(nestedObject(buildSetup, 'with', 'Build setup-env step')).toEqual({
      'vars-json': '${{ toJSON(vars) }}',
      ...actionSecretBindings(BUILD_SECRETS),
      'github-sha': '${{ github.sha }}',
    });

    for (const [file, jobName, expected] of [
      ['deploy.yml', 'deploy', BUILD_SECRETS],
      ['add-word.yml', 'add-word', ADD_WORD_SECRETS],
    ] as const) {
      const job = nestedObject(workflowJobs(workflow(file)), jobName, `${file} jobs`);
      expect(nestedObject(job, 'secrets', `${file} ${jobName} job`)).toEqual(repositorySecretBindings(expected));
    }
  });

  // The engine checkout is a uses: step, so no script runs: its with: values
  // are evaluated as GitHub would evaluate them. The context holds only the
  // job's own workflow identity, so a value that reads an input, a step
  // output or github.workflow_sha fails here.
  describe.each([
    ['site-deploy.yml', 'deploy.yml'],
    ['site-add-word.yml', 'add-word.yml'],
  ])('%s engine checkout', (file, caller) => {
    const engineCheckout = (repository: string): Record<string, string> => {
      const step = workflowSteps(workflow(file)).find(found => optionalString(found, 'name') === 'Checkout engine');
      if (!step) {
        throw new Error(`${file} has no engine checkout`);
      }
      expect(requiredString(step, 'uses', 'engine checkout')).toMatch(/^actions\/checkout@/);
      const context = { 'job.workflow_repository': repository, 'job.workflow_sha': SHA };
      const values = objectValue(field(step, 'with', 'engine checkout'), 'engine checkout with');
      return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, evaluate(value, context)]));
    };

    // A site calling a release runs this repository's workflow, so the
    // engine is the commit its uses: pin names and nothing the caller passes
    it('checks out the repository and commit of the workflow that is running', () => {
      expect(engineCheckout(ENGINE_REPOSITORY)).toEqual({
        repository: ENGINE_REPOSITORY,
        ref: SHA,
        path: 'engine',
        'persist-credentials': 'false',
      });
    });

    // A ./ call runs the called workflow from the caller's own commit, which
    // for a fork is a commit only the fork has
    it('checks out the calling commit when a fork that has not moved to a thin site calls its own copy', () => {
      expect(engineCheckout('seriouslysean/wordbug')).toMatchObject({ repository: 'seriouslysean/wordbug', ref: SHA });
    });

    // GitHub refuses a call that passes an input the workflow does not
    // declare, and a site caller calls a release, which actionlint cannot read
    it('declares exactly the inputs the site caller passes', () => {
      const template = objectValue(load(fs.readFileSync(path.join(ROOT, 'tools/templates/site', caller), 'utf-8')), caller);
      const templateJobs = Object.values(nestedObject(template, 'jobs', 'site caller jobs'));
      const job = templateJobs[0];
      if (job === undefined) {
        throw new Error(`${caller} has no job`);
      }
      const workflowCall = nestedObject(workflow(file), 'on', 'workflow trigger');
      const inputs = nestedObject(workflowCall, 'workflow_call', 'workflow call');
      const declaredInputs = objectOrEmpty(inputs, 'inputs');
      const callerJob = objectValue(job, 'site caller job');
      const callerWith = objectOrEmpty(callerJob, 'with');

      expect(Object.keys(declaredInputs)).toEqual(Object.keys(callerWith));
    });
  });

  describe('site-add-word.yml from input to push', () => {
    const FILE = 'site-add-word.yml';
    const OWNER = 'someone';
    const SOCIAL = 'public/images/social';

    // Stands in for the tools in engine/: logs its arguments NUL-separated,
    // one call per line, and writes what add-word and a complete generation
    // write, along with files that must never be committed. The generation
    // also rewrites one card and loses another, and leaves the marker the
    // size and time it had, as a new hash written in the same second would.
    const FAKE_NPM = `#!/usr/bin/env bash
printf '%s\\0' "$@" >> "$NPM_LOG"
printf '\\n' >> "$NPM_LOG"
case "$2" in
  tool:add-word)
    printf '{"word":"%s"}\\n' "\${@: -2:1}" > data/words/2026/20260918.json
    echo draft > data/words/2026/20260918.json.bak
    ;;
  tool:generate-images)
    echo new card > ${SOCIAL}/2026/20260918.png
    echo refreshed card > ${SOCIAL}/2026/20260101.png
    echo new marker > ${SOCIAL}/.image-settings-hash
    touch -r ../site/${SOCIAL}/.image-settings-hash ${SOCIAL}/.image-settings-hash
    echo stray > ${SOCIAL}/2026/20260918.webp
    echo stray > ${SOCIAL}/debug.log
    echo stray > public/stray.txt
    rm ${SOCIAL}/2025/20250101.png
    ;;
esac
`;

    const stepEnv = (): Record<string, string> => ({
      PATH: `${path.join(ctx.dir, 'bin')}:${process.env.PATH ?? ''}`,
      NPM_LOG: path.join(ctx.dir, 'npm.log'),
      GITHUB_REPOSITORY: `${OWNER}/wordbun`,
      GITHUB_REPOSITORY_OWNER: OWNER,
      GITHUB_REF: 'refs/heads/main',
      SOURCE_DIR: '',
    });

    const npmCalls = (): string[][] => fs.readFileSync(path.join(ctx.dir, 'npm.log'), 'utf-8')
      .split('\n').filter(Boolean).map(line => line.split('\0').slice(0, -1));

    // The steps from the overlay on, as the runner would run them after the
    // checkouts, install and setup-env
    const addWord = async ({
      word, date = '', overwrite = 'false', preserveCase = 'false', beforeCommit = () => {},
    }: AddWordOptions): Promise<AddWordResult> => {
      const env = stepEnv();
      const overlay = await runStep(FILE, 'Overlay site content', { env });
      expect(overlay.code).toBe(0);

      const added = await runStep(FILE, 'Add word', {
        env,
        context: { 'inputs.word': word, 'inputs.date': date, 'inputs.overwrite': overwrite, 'inputs.preserve_case': preserveCase },
      });
      const outputs = parseOutputs(added.outputs);
      if (outputs.word_added !== '1') {
        return { added, outputs };
      }

      const engineBefore = snapshot('engine');
      expect((await runStep(FILE, 'Configure Git', { env })).code).toBe(0);
      beforeCommit();
      const committed = await runStep(FILE, 'Commit and push changes', {
        env,
        context: { 'steps.add_word.outputs.word': outputs.word ?? '' },
      });
      return { added, outputs, committed, engineBefore, engineAfter: snapshot('engine') };
    };

    beforeEach(() => {
      write('bin/npm', FAKE_NPM);
      fs.chmodSync(path.join(ctx.dir, 'bin/npm'), 0o755);

      write('engine/package.json', '{}\n');
      write('engine/src/pages/index.astro', 'engine page\n');
      write('engine/data/demo/words/2025/20250101.json', '{"word":"demo"}\n');
      write('engine/public/favicon.svg', 'engine favicon\n');

      git('.', 'init', '--quiet', '--bare', '--initial-branch=main', 'origin.git');
      git('.', 'init', '--quiet', '--initial-branch=main', 'site');
      write('site/data/words/2026/20260101.json', '{"word":"first"}\n');
      write(`site/${SOCIAL}/2026/20260101.png`, 'old card\n');
      write(`site/${SOCIAL}/2025/20250101.png`, 'kept card\n');
      write(`site/${SOCIAL}/.image-settings-hash`, 'old marker\n');
      git('site', 'add', '-A');
      git('site', 'commit', '--quiet', '-m', 'site');
      git('site', 'remote', 'add', 'origin', '../origin.git');
      git('site', 'push', '--quiet', 'origin', 'main');
    });

    it('commits only the word file, cards and marker as the repository owner, and pushes', async () => {
      const result = await addWord({ word: 'serendipity' });
      if (!result.committed || !result.engineBefore || !result.engineAfter) {
        throw new Error('expected add-word to commit changes');
      }

      expect(result.committed.code).toBe(0);
      expect(git('site', 'show', '--name-status', '--format=', 'HEAD').split('\n')).toEqual([
        'A\tdata/words/2026/20260918.json',
        `M\t${SOCIAL}/.image-settings-hash`,
        `M\t${SOCIAL}/2026/20260101.png`,
        `A\t${SOCIAL}/2026/20260918.png`,
      ]);
      expect(git('site', 'log', '-1', '--format=%an <%ae>|%cn <%ce>|%s')).toBe(
        `${OWNER} <${OWNER}@users.noreply.github.com>|${OWNER} <${OWNER}@users.noreply.github.com>|Add word: serendipity`,
      );
      expect(git('origin.git', 'rev-parse', 'main')).toBe(git('site', 'rev-parse', 'HEAD'));
      expect(git('site', 'status', '--porcelain', '--untracked-files=all')).toBe('');
      expect(fs.readFileSync(path.join(ctx.dir, 'site', SOCIAL, '2025/20250101.png'), 'utf-8')).toBe('kept card\n');
      expect(result.engineAfter).toEqual(result.engineBefore);
    });

    it.each([
      ['a command substitution, trimmed', '  $(touch PWNED)  ', '$(touch PWNED)'],
      ['an apostrophe', "don't", "don't"],
      ['a leading dash', '-ish', '-ish'],
    ])('keeps %s as data', async (_, input, word) => {
      const result = await addWord({ word: input });
      if (!result.committed) {
        throw new Error('expected add-word to commit changes');
      }

      expect(result.committed.code).toBe(0);
      expect(npmCalls()[0]).toEqual(['run', 'tool:add-word', '--', '--', word, '']);
      expect(git('site', 'log', '-1', '--format=%s')).toBe(`Add word: ${word}`);
      expect(fs.readdirSync(ctx.dir, { recursive: true }).filter(file => path.basename(String(file)) === 'PWNED')).toEqual([]);
    });

    it('passes the switches and the date to the tool', async () => {
      const result = await addWord({ word: 'Japan', date: ' 20260918 ', overwrite: 'true', preserveCase: 'true' });
      if (!result.committed) {
        throw new Error('expected add-word to commit changes');
      }

      expect(result.committed.code).toBe(0);
      expect(npmCalls()).toEqual([
        ['run', 'tool:add-word', '--', '--overwrite', '--preserve-case', '--', 'Japan', '20260918'],
        ['run', 'tool:generate-images'],
      ]);
    });

    it('refuses a blank word before running a tool', async () => {
      const result = await addWord({ word: ' \t ' });

      expect(result.added.code).toBe(1);
      expect(result.added.output).toContain('::error::Word cannot be empty');
      expect(fs.existsSync(path.join(ctx.dir, 'npm.log'))).toBe(false);
    });

    it('ends without a commit when nothing changed', async () => {
      await addWord({ word: 'serendipity' });
      const head = git('site', 'rev-parse', 'HEAD');

      const again = await addWord({ word: 'serendipity' });
      if (!again.committed) {
        throw new Error('expected no-op add-word to complete');
      }

      expect(again.committed.code).toBe(0);
      expect(again.committed.output).toContain('::notice::Nothing changed');
      expect(git('site', 'rev-parse', 'HEAD')).toBe(head);
      expect(git('origin.git', 'rev-parse', 'main')).toBe(head);
    });

    it('fails rather than force when main moved on', async () => {
      const result = await addWord({
        word: 'serendipity',
        beforeCommit: () => {
          git('.', 'clone', '--quiet', 'origin.git', 'other');
          write('other/README.md', 'pushed meanwhile\n');
          git('other', 'add', 'README.md');
          git('other', 'commit', '--quiet', '-m', 'meanwhile');
          git('other', 'push', '--quiet', 'origin', 'main');
        },
      });
      if (!result.committed) {
        throw new Error('expected add-word to reach commit step');
      }

      expect(result.committed.code).not.toBe(0);
      expect(result.committed.output).toMatch(/rejected|non-fast-forward|fetch first/);
      expect(git('origin.git', 'rev-parse', 'main')).toBe(git('other', 'rev-parse', 'HEAD'));
    });
  });

  // The content contract end to end on one synthetic site, with the tools
  // replaced by a fake that writes what they write: a word file, and a card
  // named YYYYMMDD-<lower-case word>.png for every word plus a page card and
  // the marker. The site has a word with a space and an ampersand, its own
  // favicon, and a stale card for a word it no longer has.
  describe('a synthetic site through overlay and copy-back', () => {
    const SOCIAL = 'public/images/social';
    const ROCK = `${SOCIAL}/2026/20260101-rock & roll.png`;
    const STALE = `${SOCIAL}/2025/20251231-gone.png`;

    const FAKE_TOOLS = `#!/usr/bin/env bash
case "$2" in
  tool:add-word)
    jq -n --arg word "\${@: -2:1}" '{word: $word}' > data/words/2026/20260918.json
    ;;
  tool:generate-images)
    for file in data/words/*/*.json; do
      date=$(basename "$file" .json)
      word=$(jq -r .word "$file")
      lower=$(printf '%s' "$word" | tr '[:upper:]' '[:lower:]')
      mkdir -p "${SOCIAL}/\${date:0:4}"
      printf 'card for %s\\n' "$word" > "${SOCIAL}/\${date:0:4}/$date-$lower.png"
    done
    mkdir -p ${SOCIAL}/pages
    echo 'page card' > ${SOCIAL}/pages/index.png
    echo 'new marker' > ${SOCIAL}/.image-settings-hash
    ;;
esac
`;

    const SITE: Record<string, string> = {
      'data/words/2026/20260101.json': '{"word":"Rock & Roll"}\n',
      'data/words/2026/20260102.json': '{"word":"serendipity"}\n',
      [ROCK]: 'old card\n',
      [`${SOCIAL}/2026/20260102-serendipity.png`]: 'card for serendipity\n',
      [STALE]: 'stale card\n',
      [`${SOCIAL}/.image-settings-hash`]: 'old marker\n',
      'public/favicon.svg': 'site favicon\n',
    };

    const ENGINE_CODE: Record<string, string> = {
      'package.json': '{}\n',
      'src/pages/index.astro': 'engine page\n',
    };

    const env = (): Record<string, string> => ({
      PATH: `${path.join(ctx.dir, 'bin')}:${process.env.PATH ?? ''}`,
      GITHUB_REPOSITORY: 'someone/wordbee',
      GITHUB_REPOSITORY_OWNER: 'someone',
      GITHUB_REF: 'refs/heads/main',
      SOURCE_DIR: '',
    });

    beforeEach(() => {
      write('bin/npm', FAKE_TOOLS);
      fs.chmodSync(path.join(ctx.dir, 'bin/npm'), 0o755);

      Object.entries(ENGINE_CODE).forEach(([file, content]) => write(`engine/${file}`, content));
      write('engine/data/demo/words/2025/20250101.json', '{"word":"demo"}\n');
      write('engine/public/favicon.svg', 'engine favicon\n');
      write('engine/public/demo/images/social/2025/20250101-demo.png', 'demo card\n');

      git('.', 'init', '--quiet', '--bare', '--initial-branch=main', 'origin.git');
      git('.', 'init', '--quiet', '--initial-branch=main', 'site');
      Object.entries(SITE).forEach(([file, content]) => write(`site/${file}`, content));
      git('site', 'add', '-A');
      git('site', 'commit', '--quiet', '-m', 'site');
      git('site', 'remote', 'add', 'origin', '../origin.git');
      git('site', 'push', '--quiet', 'origin', 'main');
    });

    it('builds from exactly the site content, favicon and stale card included', async () => {
      const result = await runStep('site-deploy.yml', 'Overlay site content', { env: env() });

      expect(result.code).toBe(0);
      expect(snapshot('engine')).toEqual({ ...ENGINE_CODE, ...SITE });
    });

    it('commits only the new word, the cards that changed and the marker', async () => {
      const overlay = await runStep('site-add-word.yml', 'Overlay site content', { env: env() });
      expect(overlay.code).toBe(0);
      const added = await runStep('site-add-word.yml', 'Add word', {
        env: env(),
        context: { 'inputs.word': 'Ice Cream', 'inputs.date': '', 'inputs.overwrite': 'false', 'inputs.preserve_case': 'false' },
      });
      expect(added.code).toBe(0);
      expect((await runStep('site-add-word.yml', 'Configure Git', { env: env() })).code).toBe(0);

      const committed = await runStep('site-add-word.yml', 'Commit and push changes', {
        env: env(),
        context: { 'steps.add_word.outputs.word': parseOutputs(added.outputs).word ?? '' },
      });

      expect(committed.code).toBe(0);
      expect(git('site', 'show', '--name-status', '--format=', 'HEAD').split('\n')).toEqual([
        'A\tdata/words/2026/20260918.json',
        `M\t${SOCIAL}/.image-settings-hash`,
        `M\t${ROCK}`,
        `A\t${SOCIAL}/2026/20260918-ice cream.png`,
        `A\t${SOCIAL}/pages/index.png`,
      ]);
      expect(git('origin.git', 'rev-parse', 'main')).toBe(git('site', 'rev-parse', 'HEAD'));
      expect(git('site', 'status', '--porcelain', '--untracked-files=all')).toBe('');

      const written: Record<string, string> = {
        'data/words/2026/20260918.json': '{\n  "word": "Ice Cream"\n}\n',
        [ROCK]: 'card for Rock & Roll\n',
        [`${SOCIAL}/2026/20260918-ice cream.png`]: 'card for Ice Cream\n',
        [`${SOCIAL}/pages/index.png`]: 'page card\n',
        [`${SOCIAL}/.image-settings-hash`]: 'new marker\n',
      };
      expect(snapshot('engine')).toEqual({ ...ENGINE_CODE, ...SITE, ...written });
      const siteTree = Object.entries(snapshot('site')).filter(([file]) => !file.startsWith('.git/'));
      expect(Object.fromEntries(siteTree)).toEqual({ ...SITE, ...written });
    });
  });
});

  // Checkouts are uses: steps, so these read the order of the steps. A
  // checkout that keeps its credentials leaves a token that can push where
  // any later process can read it, and npm ci runs every dependency's install script.
  describe.each([
    ['site-deploy.yml'],
    ['site-add-word.yml'],
  ])('%s step order', (file) => {
    const steps = (): YamlObject[] => workflowSteps(workflow(file));
    const indexOf = (name: string): number => steps().findIndex(step => optionalString(step, 'name') === name);

    it('installs dependencies before any checkout that keeps its credentials', () => {
      const install = indexOf('Install dependencies');
      const keeping = steps().slice(0, install)
        .filter(step => (optionalString(step, 'uses') ?? '').startsWith('actions/checkout@')
          && objectOrEmpty(step, 'with')['persist-credentials'] !== false);

      expect(install).toBeGreaterThan(0);
      expect(keeping.map(step => optionalString(step, 'name'))).toEqual([]);
    });

    it('checks out the site before any step that reads it', () => {
      expect(indexOf('Checkout site')).toBeGreaterThanOrEqual(0);
      expect(steps().findIndex(readsSite)).toBeGreaterThan(indexOf('Checkout site'));
    });
  });

  describe.each([
    ['site-deploy.yml'],
    ['site-add-word.yml'],
  ])('%s overlay', (file) => {
    const overlay = (repository: string, sourceDir: string): Promise<StepResult> => runStep(file, 'Overlay site content', {
      env: { GITHUB_REPOSITORY: repository, SOURCE_DIR: sourceDir },
    });

    beforeEach(() => {
      write('engine/package.json', '{}\n');
      write('engine/src/pages/index.astro', 'engine page\n');
      write('engine/data/demo/words/2025/20250101.json', '{"word":"demo"}\n');
      write('engine/public/favicon.svg', 'engine favicon\n');
      write('engine/public/demo/images/social/2025/demo.png', 'demo card\n');
      write('engine/public/demo/images/social/.image-settings-hash', 'demo marker\n');
    });

    const thinSite = (): void => {
      write('site/data/words/2026/20260101.json', '{"word":"site"}\n');
      write('site/public/images/social/2026/site.png', 'site card\n');
      write('site/public/images/social/.image-settings-hash', 'site marker\n');
      write('site/public/robots.txt', 'site robots\n');
    };

    it('mirrors a thin site and drops the demo content, keeping the engine favicon', async () => {
      thinSite();
      const code = snapshot('engine/src');

      const result = await overlay('someone/wordbun', '');

      expect(result.code).toBe(0);
      expect(snapshot('engine/data')).toEqual(snapshot('site/data'));
      expect(snapshot('engine/public')).toEqual({ ...snapshot('site/public'), 'favicon.svg': 'engine favicon\n' });
      expect(snapshot('engine/src')).toEqual(code);
    });

    // Same size and time as the engine's, which rsync's quick check skips
    it("uses the site's favicon when it has one", async () => {
      thinSite();
      write('site/public/favicon.svg', 'custom favicon\n');
      const time = new Date('2026-09-18T12:00:00Z');
      fs.utimesSync(path.join(ctx.dir, 'site/public/favicon.svg'), time, time);
      fs.utimesSync(path.join(ctx.dir, 'engine/public/favicon.svg'), time, time);

      const result = await overlay('someone/wordbun', '');

      expect(result.code).toBe(0);
      expect(snapshot('engine/public')).toEqual(snapshot('site/public'));
    });

    it('leaves the demo content in place for this repository', async () => {
      fs.cpSync(path.join(ctx.dir, 'engine/data'), path.join(ctx.dir, 'site/data'), { recursive: true });
      fs.cpSync(path.join(ctx.dir, 'engine/public'), path.join(ctx.dir, 'site/public'), { recursive: true });
      const before = snapshot('engine');

      const result = await overlay(ENGINE_REPOSITORY, 'demo');

      expect(result.code).toBe(0);
      expect(snapshot('engine')).toEqual(before);
    });

    // A fork calls with ./, so site/ and engine/ are one commit, which
    // tracks the demo content beside the fork's own
    it('changes nothing for a fork, whose demo content stays and goes unread', async () => {
      write('engine/data/words/2026/20260101.json', '{"word":"fork"}\n');
      write('engine/public/images/social/2026/fork.png', 'fork card\n');
      write('engine/public/images/social/.image-settings-hash', 'fork marker\n');
      fs.cpSync(path.join(ctx.dir, 'engine/data'), path.join(ctx.dir, 'site/data'), { recursive: true });
      fs.cpSync(path.join(ctx.dir, 'engine/public'), path.join(ctx.dir, 'site/public'), { recursive: true });
      const before = snapshot('engine');

      const result = await overlay('seriouslysean/wordbug', '');

      expect(result.code).toBe(0);
      expect(snapshot('engine')).toEqual(before);
      expect(Object.keys(before)).toContain('data/demo/words/2025/20250101.json');
    });

    it.each([
      ['the demo content in a site repository', 'someone/wordbun', 'demo'],
      ['another directory in a site repository', 'someone/wordbun', 'wordbun'],
      ['the demo content in a fork', 'seriouslysean/wordbug', 'demo'],
      ['the root content in this repository', ENGINE_REPOSITORY, ''],
    ])('refuses %s', async (_, repository, sourceDir) => {
      thinSite();
      write('site/data/demo/words/2025/20250101.json', '{"word":"demo"}\n');
      const before = snapshot('engine');

      const result = await overlay(repository, sourceDir);

      expect(result.code).toBe(1);
      expect(result.output).toContain('::error::SOURCE_DIR');
      expect(snapshot('engine')).toEqual(before);
    });

    it.each([
      ['words', 'site/public/favicon.svg'],
      ['public files', 'site/data/words/2026/20260101.json'],
    ])('refuses a site without %s instead of emptying the engine', async (_, onlyFile) => {
      write(onlyFile, 'only\n');
      const before = snapshot('engine');

      const result = await overlay('someone/wordbun', '');

      expect(result.code).toBe(1);
      expect(result.output).toContain('::error::The site needs');
      expect(snapshot('engine')).toEqual(before);
    });

    // rsync -a copies a link as a link, so the tools would write through it,
    // and the build read through it, outside the engine checkout
    it.each([
      ['a link under public', 'public/images/social', '../../../outside'],
      ['a link under data', 'data/words/2026/20260102.json', '../../../../outside/word.json'],
      ['public itself as a link', 'public', '../outside'],
    ])('refuses %s before copying anything', async (_, link, target) => {
      write('outside/word.json', '{"word":"outside"}\n');
      fs.mkdirSync(path.dirname(path.join(ctx.dir, 'site', link)), { recursive: true });
      fs.symlinkSync(target, path.join(ctx.dir, 'site', link));
      write('site/data/words/2026/20260101.json', '{"word":"site"}\n');
      write('site/public/robots.txt', 'site robots\n');
      const before = { engine: snapshot('engine'), outside: snapshot('outside') };

      const result = await overlay('someone/wordbun', '');

      expect(result.code).toBe(1);
      expect(result.output).toContain(`::error::${link} is a symbolic link`);
      expect({ engine: snapshot('engine'), outside: snapshot('outside') }).toEqual(before);
    });
  });
