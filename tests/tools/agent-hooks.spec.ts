/**
 * .claude/hooks/*.sh as Claude Code runs them: the PreToolUse JSON on stdin,
 * exit 2 to block, exit 0 to let the call through. The main-branch guard runs
 * against a real repository in a temp dir with a second worktree on its own
 * branch. Git reads none of the machine's configuration.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const HOOKS = path.join(process.cwd(), '.claude/hooks');

const ctx: { root: string; env: NodeJS.ProcessEnv; repo: string; worktree: string; other: string } = {
  root: '',
  env: {},
  repo: '',
  worktree: '',
  other: '',
};

const runHook = (script: string, toolInput: Record<string, string>, env: NodeJS.ProcessEnv = {}): number | null =>
  spawnSync('bash', [path.join(HOOKS, script)], {
    input: JSON.stringify({
      session_id: 'fixture',
      cwd: ctx.repo,
      hook_event_name: 'PreToolUse',
      tool_name: 'fixture',
      tool_input: toolInput,
    }),
    cwd: ctx.root,
    env: { ...ctx.env, ...env },
    encoding: 'utf-8',
  }).status;

const git = (cwd: string, ...args: string[]): void => {
  execFileSync('git', args, { cwd, env: ctx.env, stdio: 'pipe' });
};

beforeAll(() => {
  ctx.root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'agent-hooks-')));
  ctx.repo = path.join(ctx.root, 'repo');
  ctx.worktree = path.join(ctx.repo, '.claude/worktrees/agent');
  ctx.other = path.join(ctx.root, 'other');
  ctx.env = {
    PATH: process.env.PATH ?? '',
    HOME: ctx.root,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Fixture',
    GIT_AUTHOR_EMAIL: 'fixture@example.com',
    GIT_COMMITTER_NAME: 'Fixture',
    GIT_COMMITTER_EMAIL: 'fixture@example.com',
  };

  for (const dir of [ctx.repo, ctx.other]) {
    fs.mkdirSync(dir);
    git(dir, 'init', '--quiet', '--initial-branch=main');
    git(dir, 'commit', '--quiet', '--allow-empty', '-m', 'initial');
  }
  git(ctx.repo, 'worktree', 'add', '--quiet', '-b', 'feature', ctx.worktree);
});

afterAll(() => {
  fs.rmSync(ctx.root, { recursive: true, force: true });
});

describe('git-block-destructive.sh', () => {
  const run = (command: string, description = 'fixture'): number | null =>
    runHook('git-block-destructive.sh', { command, description });

  it.each([
    'rm -rf build',
    'rm -r -f build',
    'rm --recursive --force build',
    'git reset --hard',
    'git reset HEAD~1 --hard',
    'git -C . reset --hard',
    'git -c core.editor=true reset --hard',
    'git "reset" --hard',
    'git clean -f',
    'git clean -fdx',
    'git clean -d --force',
    'git push --force',
    'git push -uf origin feature',
    'git push origin +main',
    'git -C . push -f',
    'git push --force --force-with-lease',
    'git push --force-with-lease origin feature && git push -f origin main',
    'git checkout .',
    'git checkout HEAD -- .',
    'git checkout -- "."',
    'git restore .',
    'git restore --staged .',
    'if true; then git reset --hard; fi',
    'echo "$(git clean -f)"',
    'git status\ngit reset --hard',
    'git push \\\n  --force origin main',
    'rm -r \\\n -f build',
    'git reset \\\n  --hard',
    'git reset --hard>/dev/null',
    'git push origin main --force<<<""',
    'git -C. reset --hard',
    'git -C "/tmp/my repo" reset --hard',
    'git -C "/tmp/my repo" push -f',
    'git -C "$(git rev-parse --show-toplevel)" reset --hard',
    'git --git-dir .git --work-tree . reset --hard',
  ])('blocks %j', (command) => {
    expect(run(command)).toBe(2);
  });

  it.each([
    'rm build/file.txt',
    'rm -r build',
    'grep -rf patterns.txt rm src',
    'git reset --soft HEAD~1',
    'git clean -n',
    'git push --force-with-lease origin feature',
    'git push --force-with-lease --force-if-includes origin feature',
    'git push -u origin fix-foo',
    'git push --follow-tags',
    'git checkout -b feature',
    'git checkout main -- src/file.ts',
    'git restore src/a.ts',
    'git restore a.ts && ls .',
    'git add .',
    'git diff main...HEAD -- .',
    'git -C . checkout -b feature',
    'git -C . checkout main',
    'git -C . restore src/a.ts',
    'git clean -nfd',
    'git clean --dry-run -fd',
  ])('allows %j', (command) => {
    expect(run(command)).toBe(0);
  });

  it('reads the command only, not the description beside it', () => {
    expect(run('ls -la', 'instead of rm -rf or git reset --hard')).toBe(0);
  });

  it('blocks when the input cannot be read', () => {
    const result = spawnSync('bash', [path.join(HOOKS, 'git-block-destructive.sh')], {
      input: 'not json',
      env: ctx.env,
      encoding: 'utf-8',
    });

    expect(result.status).toBe(2);
  });
});

describe('git-guard-main-branch.sh', () => {
  const run = (toolInput: Record<string, string>, projectDir: string = ctx.repo): number | null =>
    runHook('git-guard-main-branch.sh', toolInput, { CLAUDE_PROJECT_DIR: projectDir });

  it('blocks a file in the checkout on main', () => {
    expect(run({ file_path: path.join(ctx.repo, 'src/new/file.ts') })).toBe(2);
  });

  it('blocks a notebook in the checkout on main', () => {
    expect(run({ notebook_path: path.join(ctx.repo, 'notes.ipynb') })).toBe(2);
  });

  it('allows a file in a worktree on its own branch under the project root', () => {
    expect(run({ file_path: path.join(ctx.worktree, 'src/file.ts') })).toBe(0);
  });

  it('blocks a file in the main checkout when the session started in a worktree', () => {
    expect(run({ file_path: path.join(ctx.repo, 'file.ts') }, ctx.worktree)).toBe(2);
  });

  it('allows a file in another repository, even on its main', () => {
    expect(run({ file_path: path.join(ctx.other, 'file.ts') })).toBe(0);
  });

  it('allows a file outside any repository', () => {
    expect(run({ file_path: path.join(ctx.root, 'notes.md') })).toBe(0);
  });

  it('blocks on main when the input names no file', () => {
    expect(run({})).toBe(2);
    expect(run({}, ctx.worktree)).toBe(0);
  });
});
