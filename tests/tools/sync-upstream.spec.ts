/**
 * tools/sync-upstream.sh against real repositories in a temp dir: a bare
 * upstream, the downstream's own bare origin, and a downstream clone whose
 * history has diverged. A fake npm first on PATH records every call and can
 * fail one gate, so nothing is installed, nothing reaches the network, and
 * the gates run in no time. Git reads none of the machine's configuration,
 * only the fixture's own, which switches its background maintenance off.
 */

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

interface CommandResult {
  code: number | null;
  output: string;
}

interface SyncContext {
  root: string;
  env: NodeJS.ProcessEnv;
  engine: string;
  site: string;
  origin: string;
}

const SCRIPT = path.join(process.cwd(), 'tools/sync-upstream.sh');

const GATES = ['ci', 'run lint', 'run typecheck', 'test', 'run build', 'run test:e2e'];

// What follows the gates in a downstream that tracks words of its own
const NORMALIZE = 'run tool:normalize-word-data -- --dry-run';
const OWN_WORDS = ['run build', NORMALIZE];

// Logs each call as its arguments, a tab, the SOURCE_DIR and BASE_PATH it saw,
// a tab, and the SENTRY_ENABLED it saw, "unset" for one it did not. NPM_FAIL names the call that fails, and
// NPM_FAIL_OWN_BUILD fails only the build whose SOURCE_DIR is set and empty;
// NPM_WRITE is a file the build appends to, as a gate that rewrites a tracked
// file would. NPM_NORMALIZE is how many files the normalizer's dry run says
// it would rewrite, in the tool's own words.
const FAKE_NPM = `#!/usr/bin/env bash
printf '%s\\t%s:%s\\t%s\\n' "$*" "\${SOURCE_DIR-unset}" "\${BASE_PATH-unset}" "\${SENTRY_ENABLED-unset}" >> "$NPM_LOG"
if [[ -n "\${NPM_WRITE-}" && "$*" == "run build" ]]; then
  echo changed >> "$NPM_WRITE"
fi
if [[ "$*" == "${NORMALIZE}" ]]; then
  for ((i = 0; i < \${NPM_NORMALIZE-0}; i++)); do
    echo "Would normalize word file { file: 'data/words/2026/$i.json' }"
  done
fi
if [[ "$*" == "\${NPM_FAIL-}" ]]; then
  exit 1
fi
if [[ -n "\${NPM_FAIL_OWN_BUILD-}" && "$*" == "run build" && -z "\${SOURCE_DIR-unset}" ]]; then
  exit 1
fi
`;

const PACKAGE_JSON = `{
  "name": "engine",
  "private": true,
  "version": "1.0.0",
  "description": "fixture",
  "dependencies": {
    "a": "1.0.0"
  }
}
`;

const LOCKFILE = `{
  "name": "engine",
  "lockfileVersion": 3,
  "packages": {
    "node_modules/a": {
      "version": "1.0.0"
    }
  }
}
`;

// A commit, fetch, merge or received push otherwise ends by starting a
// detached "git maintenance run --auto", which holds
// .git/objects/maintenance.lock for a moment after the command has returned
// (seen with git 2.56). A copy of a repository made in that moment fails as
// the file vanishes, with "ENOENT ... .git/objects". That is the likely cause
// of the one failure seen, on a busy machine, and not a reproduced one: it
// was the first case, whose copy comes straight after the template's last
// fetch, and its error named site/.git/objects. The switch is a file because
// under GIT_CONFIG_COUNT a push still started maintenance in the repository
// receiving it. gc.auto is the same switch for a git that predates
// maintenance.auto.
const GIT_CONFIG = `[maintenance]
\tauto = false
[gc]
\tauto = 0
`;

const ctx: SyncContext = { root: '', env: {}, engine: '', site: '', origin: '' };

const git = (cwd: string, ...args: string[]): string => String(execFileSync('git', args, {
  cwd,
  env: ctx.env,
  encoding: 'utf-8',
  stdio: 'pipe',
})).trim();

const write = (dir: string, file: string, content: string): void => {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), content);
};

const commit = (dir: string, files: Record<string, string>, message: string): void => {
  for (const [file, content] of Object.entries(files)) {
    write(dir, file, content);
  }
  git(dir, 'add', '-A');
  git(dir, 'commit', '--quiet', '-m', message);
};

// A new upstream release
const release = (files: Record<string, string>, message = 'engine change'): void => {
  commit(ctx.engine, files, message);
  git(ctx.engine, 'push', '--quiet', 'origin', 'main');
};

// The downstream's own history: a word it added
const diverge = (files: Record<string, string> = { 'data/words/2026/20260101.json': '{"word":"site"}\n' }): void => {
  commit(ctx.site, files, 'site change');
  git(ctx.site, 'push', '--quiet', 'origin', 'main');
};

const sync = (args: string[] = [], env: NodeJS.ProcessEnv = {}, cwd: string = ctx.site): Promise<CommandResult> => {
  const { promise, resolve, reject } = Promise.withResolvers<CommandResult>();
  const proc = spawn('bash', [SCRIPT, ...args], { cwd, env: { ...ctx.env, ...env } });
  const chunks: { stdout: string[]; stderr: string[] } = { stdout: [], stderr: [] };
  proc.stdout.on('data', (data: Buffer | string) => chunks.stdout.push(data.toString()));
  proc.stderr.on('data', (data: Buffer | string) => chunks.stderr.push(data.toString()));
  proc.on('error', reject);
  proc.on('close', code => resolve({ code, output: [...chunks.stdout, ...chunks.stderr].join('') }));
  return promise;
};

const npmCalls = (): string[] => {
  const log = path.join(ctx.root, 'npm.log');
  return fs.existsSync(log) ? fs.readFileSync(log, 'utf-8').trim().split('\n') : [];
};
const gatesRun = (): string[] => npmCalls().map(line => line.split('\t')[0] ?? '');

const syncBranches = (): string => git(ctx.site, 'branch', '--list', 'sync/*', '--format=%(refname:short)');
const expectedBranch = (): string => `sync/upstream-${git(ctx.site, 'rev-parse', '--short', 'upstream/main')}`;
const originRefs = (): string => git(ctx.origin, 'for-each-ref', '--format=%(refname) %(objectname)');
const parents = (ref: string): string[] => git(ctx.site, 'rev-list', '--parents', '-n', '1', ref).split(' ').slice(1);
const isMerging = (): boolean => fs.existsSync(path.join(ctx.site, '.git', 'MERGE_HEAD'));

const useRoot = (root: string): void => {
  ctx.root = root;
  ctx.engine = path.join(root, 'engine');
  ctx.site = path.join(root, 'site');
  ctx.origin = path.join(root, 'origin.git');
  ctx.env = {
    PATH: `${path.join(root, 'bin')}:${process.env.PATH ?? ''}`,
    HOME: root,
    GIT_CONFIG_GLOBAL: path.join(root, 'gitconfig'),
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Fixture',
    GIT_AUTHOR_EMAIL: 'fixture@example.com',
    GIT_COMMITTER_NAME: 'Fixture',
    GIT_COMMITTER_EMAIL: 'fixture@example.com',
    NPM_LOG: path.join(root, 'npm.log'),
  };
};

const tempDir = (): string => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'wotd-sync-')));

// Built once and copied for each test. Remote URLs are relative, so every
// copy pushes and fetches among its own repositories.
const template: { dir: string } = { dir: '' };

beforeAll(() => {
  template.dir = tempDir();
  useRoot(template.dir);
  write(ctx.root, 'gitconfig', GIT_CONFIG);
  write(ctx.root, 'bin/npm', FAKE_NPM);
  fs.chmodSync(path.join(ctx.root, 'bin/npm'), 0o755);

  git(ctx.root, 'init', '--quiet', '--bare', '--initial-branch=main', 'upstream.git');
  git(ctx.root, 'init', '--quiet', '--initial-branch=main', 'engine');
  commit(ctx.engine, {
    '.gitignore': '.env\ndist/\n',
    'package.json': PACKAGE_JSON,
    'package-lock.json': LOCKFILE,
    'README.md': 'engine\n',
    'src/engine.ts': 'export const version = 1;\n',
  }, 'initial engine');
  git(ctx.engine, 'remote', 'add', 'origin', '../upstream.git');
  git(ctx.engine, 'push', '--quiet', 'origin', 'main');

  git(ctx.root, 'clone', '--quiet', '--bare', 'upstream.git', 'origin.git');
  git(ctx.root, 'clone', '--quiet', 'origin.git', 'site');
  git(ctx.site, 'remote', 'set-url', 'origin', '../origin.git');
  git(ctx.site, 'remote', 'add', 'upstream', '../upstream.git');
  git(ctx.site, 'fetch', '--quiet', 'upstream');
  // A dozen git processes: the default 10s hook timeout has failed the whole
  // file on a busy machine, where the cases themselves are given 90s
}, 90000);

afterAll(() => {
  fs.rmSync(template.dir, { recursive: true, force: true });
});

beforeEach(() => {
  useRoot(tempDir());
  fs.cpSync(template.dir, ctx.root, { recursive: true });
});

afterEach(() => {
  fs.rmSync(ctx.root, { recursive: true, force: true });
});

// Each case builds real repositories and runs the script end to end, taking
// 5-20 seconds alone; a busy runner has doubled that
describe('sync-upstream.sh', { timeout: 90000 }, () => {
  describe('refuses before fetching or branching', () => {
    it.each([
      ['a modified tracked file', (): void => write(ctx.site, 'README.md', 'edited\n')],
      ['a staged file', (): void => {
        write(ctx.site, 'notes.md', 'staged\n');
        git(ctx.site, 'add', 'notes.md');
      }],
      ['an untracked file', (): void => write(ctx.site, 'data/words/2026/20260102.json', '{}\n')],
    ])('with %s', async (_, dirty) => {
      diverge();
      release({ 'src/engine.ts': 'export const version = 2;\n' });
      const fetched = git(ctx.site, 'rev-parse', 'upstream/main');
      dirty();

      const result = await sync();

      expect(result.code).toBe(1);
      expect(result.output).toContain('never stashes');
      expect(git(ctx.site, 'rev-parse', 'upstream/main')).toBe(fetched);
      expect(syncBranches()).toBe('');
      expect(git(ctx.site, 'stash', 'list')).toBe('');
      expect(npmCalls()).toEqual([]);
    });

    it('off main', async () => {
      diverge();
      release({ 'src/engine.ts': 'export const version = 2;\n' });
      git(ctx.site, 'switch', '--quiet', '--create', 'feature');

      const result = await sync();

      expect(result.code).toBe(1);
      expect(result.output).toContain('Check out main');
      expect(syncBranches()).toBe('');
    });

    it('below the repository root', async () => {
      diverge();
      release({ 'src/engine.ts': 'export const version = 2;\n' });

      const result = await sync([], {}, path.join(ctx.site, 'data'));

      expect(result.code).toBe(1);
      expect(result.output).toContain('repository root');
      expect(syncBranches()).toBe('');
    });

    it('during a merge that has changed nothing yet', async () => {
      diverge();
      release({ 'src/engine.ts': 'export const version = 2;\n' });
      git(ctx.site, 'switch', '--quiet', '--create', 'empty');
      git(ctx.site, 'commit', '--quiet', '--allow-empty', '-m', 'empty');
      git(ctx.site, 'switch', '--quiet', 'main');
      git(ctx.site, 'merge', '--quiet', '--no-ff', '--no-commit', 'empty');
      expect(git(ctx.site, 'status', '--porcelain')).toBe('');

      const result = await sync();

      expect(result.code).toBe(1);
      expect(result.output).toContain('merge or rebase is in progress');
      expect(syncBranches()).toBe('');
    });

    it('when the sync branch already exists', async () => {
      diverge();
      release({ 'src/engine.ts': 'export const version = 2;\n' });
      git(ctx.site, 'fetch', '--quiet', 'upstream');
      git(ctx.site, 'branch', expectedBranch(), 'main~1');
      const existing = git(ctx.site, 'rev-parse', expectedBranch());

      const result = await sync();

      expect(result.code).toBe(1);
      expect(result.output).toContain(`${expectedBranch()} already exists`);
      expect(git(ctx.site, 'rev-parse', expectedBranch())).toBe(existing);
      expect(git(ctx.site, 'symbolic-ref', '--short', 'HEAD')).toBe('main');
      expect(isMerging()).toBe(false);
      expect(npmCalls()).toEqual([]);
    });
  });

  // Git refuses the merge itself, but only once the sync branch exists and
  // with no merge begun, so the abandon command's merge --abort would fail
  describe('refuses a copy that cannot merge upstream', () => {
    const expectUntouched = (): void => {
      expect(syncBranches()).toBe('');
      expect(git(ctx.site, 'symbolic-ref', '--short', 'HEAD')).toBe('main');
      expect(isMerging()).toBe(false);
      expect(git(ctx.site, 'status', '--porcelain', '--untracked-files=all')).toBe('');
      expect(npmCalls()).toEqual([]);
    };

    it('made without the engine history, and points at Starting a Site', async () => {
      release({ 'src/engine.ts': 'export const version = 2;\n' });
      git(ctx.site, 'switch', '--quiet', '--orphan', 'copied');
      commit(ctx.site, { 'README.md': 'engine\n', 'src/engine.ts': 'export const version = 1;\n' }, 'files copied in');
      git(ctx.site, 'branch', '--quiet', '--move', '--force', 'main');
      const main = git(ctx.site, 'rev-parse', 'main');

      const result = await sync();

      expect(result.code).toBe(1);
      expect(result.output).toContain('shares no history with upstream/main');
      expect(result.output).toContain('Starting a Site in docs/README.md');
      expect(result.output).not.toContain('conflicts');
      expect(result.output).not.toContain('git merge --abort');
      expect(git(ctx.site, 'rev-parse', 'main')).toBe(main);
      expectUntouched();
    });

    // Its one commit has no parent here, so it shares none with upstream
    it('cloned shallow, and says how to fetch the rest', async () => {
      diverge();
      release({ 'src/engine.ts': 'export const version = 2;\n' });
      fs.rmSync(ctx.site, { recursive: true, force: true });
      git(ctx.root, 'clone', '--quiet', '--depth', '1', `file://${ctx.origin}`, 'site');
      git(ctx.site, 'remote', 'add', 'upstream', '../upstream.git');

      const result = await sync();

      expect(result.code).toBe(1);
      expect(result.output).toContain('shallow clone');
      // Unshallowing cannot help a copy made without the engine's history, and
      // from a shallow clone the two cannot be told apart
      expect(result.output).toContain('If it still shares none');
      expect(result.output).toContain('Starting a Site in docs/README.md');
      expectUntouched();

      const advice = result.output.match(/\((git fetch [^)]+)\)/)?.[1];
      if (!advice) {
        throw new Error('sync output omitted the fetch command');
      }
      execFileSync('bash', ['-c', advice], { cwd: ctx.site, env: ctx.env, stdio: 'pipe' });
      expect(git(ctx.site, 'merge-base', 'HEAD', 'upstream/main')).toBe(git(ctx.site, 'rev-parse', 'main~1'));
    });
  });

  describe('does nothing', () => {
    it('without an upstream remote', async () => {
      git(ctx.site, 'remote', 'remove', 'upstream');
      const main = git(ctx.site, 'rev-parse', 'main');

      const result = await sync();

      expect(result.code).toBe(0);
      expect(result.output).toContain('Nothing to sync');
      expect(git(ctx.site, 'rev-parse', 'main')).toBe(main);
      expect(npmCalls()).toEqual([]);
    });

    it('when main already contains upstream/main', async () => {
      diverge();
      const main = git(ctx.site, 'rev-parse', 'main');

      const result = await sync();

      expect(result.code).toBe(0);
      expect(result.output).toContain('Already up to date');
      expect(git(ctx.site, 'rev-parse', 'main')).toBe(main);
      expect(syncBranches()).toBe('');
      expect(npmCalls()).toEqual([]);
    });
  });

  describe('merges on a sync branch', () => {
    // main tracks upstream/main here, as in a clone made with -o upstream,
    // so the printed publish command must name origin
    it('commits the merge after every gate passes, leaving main and the remote alone, and prints a push to origin', async () => {
      diverge();
      release({ 'src/engine.ts': 'export const version = 2;\n' });
      write(ctx.site, '.env', 'SITE_ID=local\n');
      git(ctx.site, 'branch', '--quiet', '--set-upstream-to=upstream/main', 'main');
      const main = git(ctx.site, 'rev-parse', 'main');
      const remote = originRefs();
      const upstream = git(path.join(ctx.root, 'upstream.git'), 'rev-parse', 'main');

      const result = await sync();

      expect(result.code).toBe(0);
      expect(gatesRun()).toEqual([...GATES, ...OWN_WORDS]);
      expect(npmCalls().filter(line => /^run (build|test:e2e)\t/.test(line)).map(line => line.split('\t')[1] ?? ''))
        .toEqual(['demo:/', 'demo:/', ':unset']);
      expect(result.output).not.toContain('No .env here');
      expect(git(ctx.site, 'symbolic-ref', '--short', 'HEAD')).toBe(expectedBranch());
      expect(parents('HEAD')).toEqual([main, git(ctx.site, 'rev-parse', 'upstream/main')]);
      expect(fs.readFileSync(path.join(ctx.site, 'src/engine.ts'), 'utf-8')).toContain('version = 2');
      expect(git(ctx.site, 'rev-parse', 'main')).toBe(main);
      expect(originRefs()).toBe(remote);
      expect(fs.readFileSync(path.join(ctx.site, '.env'), 'utf-8')).toBe('SITE_ID=local\n');

      const merge = git(ctx.site, 'rev-parse', 'HEAD');
      const publish = result.output.match(/^To publish: (.+)$/m)?.[1];
      if (!publish) {
        throw new Error('sync output omitted the publish command');
      }
      execFileSync('bash', ['-c', publish], { cwd: ctx.site, env: ctx.env, stdio: 'pipe' });
      expect(git(path.join(ctx.root, 'upstream.git'), 'rev-parse', 'main')).toBe(upstream);
      expect(git(ctx.origin, 'rev-parse', 'main')).toBe(merge);
    });

    it('leaves the merge staged and uncommitted when a gate fails', async () => {
      diverge();
      release({ 'src/engine.ts': 'export const version = 2;\n' });
      const main = git(ctx.site, 'rev-parse', 'main');

      const result = await sync([], { NPM_FAIL: 'run typecheck' });

      expect(result.code).toBe(1);
      expect(result.output).toContain('Failed: npm run typecheck');
      expect(result.output).toContain('git merge --abort');
      expect(gatesRun()).toEqual(['ci', 'run lint', 'run typecheck']);
      expect(git(ctx.site, 'symbolic-ref', '--short', 'HEAD')).toBe(expectedBranch());
      expect(git(ctx.site, 'rev-parse', 'HEAD')).toBe(main);
      expect(isMerging()).toBe(true);
      expect(git(ctx.site, 'diff', '--cached', '--name-only')).toBe('src/engine.ts');
      expect(git(ctx.site, 'rev-parse', 'main')).toBe(main);
    });

    it('does not commit when a gate changes a tracked file', async () => {
      diverge();
      release({ 'src/engine.ts': 'export const version = 2;\n' });
      const main = git(ctx.site, 'rev-parse', 'main');

      const result = await sync([], { NPM_WRITE: 'README.md' });

      expect(result.code).toBe(1);
      expect(result.output).toContain('merge was not committed');
      expect(git(ctx.site, 'rev-parse', 'HEAD')).toBe(main);
      expect(isMerging()).toBe(true);
    });

    // lefthook's pre-commit job runs `oxlint --fix` with stage_fixed, so a
    // hook that rewrites and stages a file is this repository's own setup
    it('fails when a commit hook changes the merge after the gates passed', async () => {
      diverge();
      release({ 'src/engine.ts': 'export const version = 2;\n' });
      write(ctx.site, '.git/hooks/pre-commit', '#!/usr/bin/env bash\necho fixed >> README.md\ngit add README.md\n');
      fs.chmodSync(path.join(ctx.site, '.git/hooks/pre-commit'), 0o755);
      const main = git(ctx.site, 'rev-parse', 'main');

      const result = await sync();

      expect(result.code).toBe(1);
      expect(result.output).toContain('commit hook changed');
      expect(result.output).not.toContain('after every gate passed');
      expect(git(ctx.site, 'rev-parse', 'main')).toBe(main);
    });

    it('explains a merge commit that a commit hook refuses', async () => {
      diverge();
      release({ 'src/engine.ts': 'export const version = 2;\n' });
      write(ctx.site, '.git/hooks/pre-commit', '#!/usr/bin/env bash\nexit 1\n');
      fs.chmodSync(path.join(ctx.site, '.git/hooks/pre-commit'), 0o755);
      const main = git(ctx.site, 'rev-parse', 'main');

      const result = await sync();

      expect(result.code).toBe(1);
      expect(result.output).toContain('could not be committed');
      expect(result.output).toContain('git merge --abort');
      expect(git(ctx.site, 'rev-parse', 'HEAD')).toBe(main);
      expect(isMerging()).toBe(true);
    });

    // With Sentry on and a token in .env, a build creates a release and
    // uploads source maps. The fake npm reads no .env, so the shell stands in
    // for it: a variable the script sets wins over both.
    it('builds with Sentry off whatever the shell has it set to', async () => {
      diverge();
      release({ 'src/engine.ts': 'export const version = 2;\n' });

      const result = await sync([], { SENTRY_ENABLED: 'true' });
      const sentrySeenBy = (gate: string): string[] => npmCalls().map(line => line.split('\t'))
        .filter(([call]) => call === gate).map(([, , sentry]) => sentry ?? '');

      expect(result.code).toBe(0);
      expect(sentrySeenBy('run build')).toEqual(['false', 'false']);
      expect(sentrySeenBy('run lint')).toEqual(['true']);
    });

    it('skips only E2E with --skip-e2e', async () => {
      diverge();
      release({ 'src/engine.ts': 'export const version = 2;\n' });

      const result = await sync(['--skip-e2e']);

      expect(result.code).toBe(0);
      expect(gatesRun()).toEqual([...GATES.filter(gate => gate !== 'run test:e2e'), ...OWN_WORDS]);
      expect(parents('HEAD')).toHaveLength(2);
    });

    it('refuses an unknown option before touching anything', async () => {
      const result = await sync(['--force']);

      expect(result.code).toBe(1);
      expect(result.output).toContain('Unknown option: --force');
      expect(npmCalls()).toEqual([]);
    });
  });

  // The gates before it build only the demo words, so without this a stored
  // word that a page cannot render is first caught by Deploy, after the push
  describe('with words of its own', () => {
    it('stops before the commit when they do not build', async () => {
      diverge();
      release({ 'src/engine.ts': 'export const version = 2;\n' });
      const main = git(ctx.site, 'rev-parse', 'main');

      const result = await sync([], { NPM_FAIL_OWN_BUILD: '1' });

      expect(result.code).toBe(1);
      expect(result.output).toContain('Failed: env SOURCE_DIR= SENTRY_ENABLED=false npm run build');
      expect(result.output).toContain('No .env here');
      expect(gatesRun()).toEqual([...GATES, 'run build']);
      expect(git(ctx.site, 'rev-parse', 'HEAD')).toBe(main);
      expect(isMerging()).toBe(true);
    });

    it('builds and checks data/words whatever SOURCE_DIR the shell has', async () => {
      diverge();
      release({ 'src/engine.ts': 'export const version = 2;\n' });

      const result = await sync([], { SOURCE_DIR: 'demo' });

      expect(result.code).toBe(0);
      expect(npmCalls().filter(line => /^run (build|tool:normalize-word-data -- --dry-run)\t/.test(line))
        .map(line => line.split('\t')[1] ?? '')).toEqual(['demo:/', ':unset', ':unset']);
    });

    it('reports what the normalizer would rewrite, and commits the merge without rewriting it', async () => {
      diverge();
      release({ 'src/engine.ts': 'export const version = 2;\n' });

      const result = await sync([], { NPM_NORMALIZE: '2' });

      expect(result.code).toBe(0);
      expect(result.output).toContain('would rewrite 2 stored word file(s)');
      expect(result.output).toContain('To rewrite them: env SOURCE_DIR= npm run tool:normalize-word-data, then review and commit the result.');
      expect(parents('HEAD')).toHaveLength(2);
      expect(git(ctx.site, 'status', '--porcelain')).toBe('');
    });

    it('says so when the normalizer would change nothing', async () => {
      diverge();
      release({ 'src/engine.ts': 'export const version = 2;\n' });

      const result = await sync();

      expect(result.code).toBe(0);
      expect(result.output).toContain('The normalizer would change no stored word.');
    });

    // A report, not a gate: the build above is what accepts the words
    it('commits the merge when the normalizer cannot check every word, and says it could not', async () => {
      diverge();
      release({ 'src/engine.ts': 'export const version = 2;\n' });

      const result = await sync([], { NPM_FAIL: NORMALIZE });

      expect(result.code).toBe(0);
      expect(result.output).toContain('could not check every stored word');
      expect(parents('HEAD')).toHaveLength(2);
    });
  });

  describe('when upstream is a fast-forward', () => {
    it('still writes a merge commit, and only after the gates', async () => {
      release({ 'src/engine.ts': 'export const version = 2;\n' });
      const main = git(ctx.site, 'rev-parse', 'main');

      const failed = await sync([], { NPM_FAIL: 'run test:e2e' });

      expect(failed.code).toBe(1);
      expect(git(ctx.site, 'rev-parse', 'HEAD')).toBe(main);

      git(ctx.site, 'merge', '--abort');
      git(ctx.site, 'switch', '--quiet', 'main');
      git(ctx.site, 'branch', '--quiet', '-D', expectedBranch());
      fs.rmSync(path.join(ctx.root, 'npm.log'));

      const passed = await sync();

      expect(passed.code).toBe(0);
      // No word of its own, so no own-words build, which would fail on none
      expect(gatesRun()).toEqual(GATES);
      expect(passed.output).toContain('Skipping the own-words build');
      expect(parents('HEAD')).toEqual([main, git(ctx.site, 'rev-parse', 'upstream/main')]);
    });
  });

  describe('with conflicts', () => {
    const upstreamLock = LOCKFILE.replace('"version": "1.0.0"', '"version": "2.0.0"');

    it('takes the upstream lockfile when package.json matches upstream', async () => {
      diverge({ 'package-lock.json': LOCKFILE.replace('"version": "1.0.0"', '"version": "1.0.1"') });
      release({
        'package.json': PACKAGE_JSON.replace('"a": "1.0.0"', '"a": "2.0.0"'),
        'package-lock.json': upstreamLock,
      });

      const result = await sync();

      expect(result.code).toBe(0);
      expect(fs.readFileSync(path.join(ctx.site, 'package-lock.json'), 'utf-8')).toBe(upstreamLock);
      expect(gatesRun()).toEqual(GATES);
      expect(parents('HEAD')).toHaveLength(2);
    });

    it('stops on a lockfile conflict when package.json differs from upstream', async () => {
      diverge({
        'package.json': PACKAGE_JSON.replace('"name": "engine"', '"name": "site"'),
        'package-lock.json': LOCKFILE.replace('"version": "1.0.0"', '"version": "1.0.1"'),
      });
      release({
        'package.json': PACKAGE_JSON.replace('"a": "1.0.0"', '"a": "2.0.0"'),
        'package-lock.json': upstreamLock,
      });
      const main = git(ctx.site, 'rev-parse', 'main');

      const result = await sync();

      expect(result.code).toBe(1);
      expect(result.output).toContain('merged package.json differs');
      expect(git(ctx.site, 'diff', '--name-only', '--diff-filter=U')).toBe('package-lock.json');
      expect(git(ctx.site, 'rev-parse', 'HEAD')).toBe(main);
      expect(npmCalls()).toEqual([]);
    });

    it('stops on any other conflict with recovery instructions', async () => {
      diverge({ 'README.md': 'site readme\n' });
      release({ 'README.md': 'engine readme\n' });
      const main = git(ctx.site, 'rev-parse', 'main');

      const result = await sync();

      expect(result.code).toBe(1);
      expect(result.output).toContain('README.md');
      expect(result.output).toContain('git merge --abort');
      expect(git(ctx.site, 'symbolic-ref', '--short', 'HEAD')).toBe(expectedBranch());
      expect(git(ctx.site, 'rev-parse', 'HEAD')).toBe(main);
      expect(git(ctx.site, 'rev-parse', 'main')).toBe(main);
      expect(npmCalls()).toEqual([]);
    });
  });
});
