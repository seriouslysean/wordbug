/**
 * scripts/check against a real repository in a temp dir, with stand-ins for
 * npm and actionlint that record how they were called. Git reads none of the
 * machine's configuration.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/check');

// Records one line per call: the two variables the builds depend on, then the arguments.
// A call whose arguments match FAIL_ON exits 1.
const NPM = `#!/usr/bin/env bash
echo "SOURCE_DIR=\${SOURCE_DIR-unset} SENTRY_ENABLED=\${SENTRY_ENABLED-unset} $*" >> "$CALLS"
[[ -n "\${FAIL_ON:-}" && "SOURCE_DIR=\${SOURCE_DIR-unset} $*" == "$FAIL_ON" ]] && exit 1
exit 0
`;

const ctx: { root: string; repo: string; env: NodeJS.ProcessEnv } = { root: '', repo: '', env: {} };

const git = (...args: string[]): void => {
  execFileSync('git', args, { cwd: ctx.repo, env: ctx.env, stdio: 'pipe' });
};

const check = (env: NodeJS.ProcessEnv = {}) => {
  const result = spawnSync('bash', [SCRIPT], { cwd: ctx.repo, env: { ...ctx.env, ...env }, encoding: 'utf-8' });
  const calls = fs.existsSync(ctx.env.CALLS ?? '') ? fs.readFileSync(ctx.env.CALLS ?? '', 'utf-8').trim().split('\n') : [];
  return { status: result.status, stdout: result.stdout, calls };
};

const trackWord = (): void => {
  fs.mkdirSync(path.join(ctx.repo, 'data/words/2025'), { recursive: true });
  fs.writeFileSync(path.join(ctx.repo, 'data/words/2025/20250101.json'), '{}\n');
  git('add', 'data/words');
  git('commit', '--quiet', '-m', 'add a word');
};

beforeEach(() => {
  ctx.root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'check-script-')));
  ctx.repo = path.join(ctx.root, 'repo');
  const bin = path.join(ctx.root, 'bin');
  fs.mkdirSync(ctx.repo);
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'npm'), NPM, { mode: 0o755 });
  fs.writeFileSync(path.join(bin, 'actionlint'), '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });
  ctx.env = {
    PATH: `${bin}:${process.env.PATH ?? ''}`,
    HOME: ctx.root,
    CALLS: path.join(ctx.root, 'calls.log'),
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Fixture',
    GIT_AUTHOR_EMAIL: 'fixture@example.com',
    GIT_COMMITTER_NAME: 'Fixture',
    GIT_COMMITTER_EMAIL: 'fixture@example.com',
  };
  git('init', '--quiet', '--initial-branch=main');
  fs.writeFileSync(path.join(ctx.repo, 'README.md'), 'fixture\n');
  git('add', 'README.md');
  git('commit', '--quiet', '-m', 'first');
});

afterEach(() => {
  fs.rmSync(ctx.root, { recursive: true, force: true });
});

describe('scripts/check', () => {
  it('builds the demo only in a repository that tracks no words of its own', () => {
    const { status, calls } = check();

    expect(status).toBe(0);
    expect(calls.filter(call => call.endsWith('run build'))).toEqual([
      'SOURCE_DIR=demo SENTRY_ENABLED=unset run build',
    ]);
  });

  it('builds a site\'s own words first, from data/words and without Sentry, then the demo', () => {
    trackWord();

    // A .env-style value in the environment must not win over the script's own
    const { status, calls } = check({ SOURCE_DIR: 'elsewhere', SENTRY_ENABLED: 'true' });

    expect(status).toBe(0);
    expect(calls.filter(call => call.endsWith('run build'))).toEqual([
      'SOURCE_DIR= SENTRY_ENABLED=false run build',
      'SOURCE_DIR=demo SENTRY_ENABLED=true run build',
    ]);
  });

  it('fails and names the step when the own-words build fails', () => {
    trackWord();

    const { status, stdout } = check({ FAIL_ON: 'SOURCE_DIR= run build' });

    expect(status).toBe(1);
    expect(stdout).toContain('FAIL build\n');
    expect(stdout).toContain('ok   build-demo');
  });
});
