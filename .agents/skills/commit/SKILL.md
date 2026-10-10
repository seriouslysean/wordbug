---
name: commit
description: Commits the current changes the way this repository expects - quality gates first, files staged by name, a Conventional Commits message that explains why. Use when the user asks to commit.
# argument-hint is Claude Code only. allowed-tools is experimental in the
# Agent Skills spec; the Bash(...) rules are Claude Code's syntax.
argument-hint: "[optional commit message hint]"
allowed-tools: Bash(npm run lint:*) Bash(npm run lint:fix:*) Bash(npm run typecheck:*) Bash(npm test:*) Bash(npx vitest run:*) Bash(npm run build:*) Bash(git status:*) Bash(git diff:*) Bash(git add:*) Bash(git commit:*) Bash(git log:*)
---

Commit the current changes following this repository's conventions (Contributing via Git in `AGENTS.md`).

## Current state

Claude Code replaces each command below with its output when the skill loads; in another agent, run them first.

- Git status: !`git status --short --branch`
- Recent commits (for message style): !`git log --oneline -5`

## Steps

1. **Validate.** Run the quality gates with the `validate` skill and fix whatever fails before going on. If the gates already passed on exactly these changes in this session, say so instead of rerunning them.

2. **Review the diff.** Read `git diff` and `git diff --staged`. Leave out what does not belong in history: `.env` and credentials, planning docs and investigation notes, temporary files, build output, stray debug code.

3. **Stage by name.** `git add <file1> <file2> ...`, one logical change per commit. `git add -A` and `git add .` sweep in whatever else is in the tree, which is how secrets and build artifacts get committed.

4. **Write the message.** [Conventional Commits](https://www.conventionalcommits.org/), imperative mood:
   - Subject: `type: summary`, under 72 characters ("add support for X", not "added")
   - Types: `feat`, `fix`, `refactor` (no behavior change), `docs`, `test`, `ci`, `chore` (maintenance, dependencies, config)
   - Body, after a blank line, when the reason is not obvious from the subject: why the change was needed, not a list of what changed
   - Hint from the user for the message, if any: $ARGUMENTS

5. **Commit and check.** `git commit`, then `git status` to confirm the tree is as expected. The pre-commit hook (lefthook) fixes lint and runs the tests related to the staged files; if it fails, fix the cause and commit again. `--no-verify` skips the one check that runs on every commit, so leave it off. When the message quotes a command the safety hook blocks (a forced push, a hard reset), write it to a file outside the repository with the file-writing tool and use `git commit -F <file>`: the hook reads the whole command line, message included.
