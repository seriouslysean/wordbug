---
description: Commit changes following project conventions (quality gates, explicit staging, why-not-what messages)
disable-model-invocation: true
allowed-tools: Bash(npm run lint:*), Bash(npm run typecheck:*), Bash(npm test:*), Bash(npm run build:*), Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*)
argument-hint: [optional commit message hint]
---

Commit the current changes following this project's conventions.

## Current state

- Git status: !`git status`
- Recent commits (for message style): !`git log --oneline -5`

## Steps

1. Run quality gates in order. Stop and fix if any fail:
   ```sh
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

2. Review the changes:
   - Check `git diff` for staged and unstaged changes
   - Identify files that should NOT be committed: `.env`, credentials, planning docs, investigation notes, temporary files

3. Stage files explicitly by name. Never use `git add -A` or `git add .`:
   ```sh
   git add <file1> <file2> ...
   ```

4. Write a commit message that explains the WHY, not the what:
   - First line: concise summary (imperative mood, under 72 chars)
   - Blank line, then body with motivation and context if not obvious
   - Match the style of recent commits in this repo
   - If the user provided a hint via $ARGUMENTS, incorporate it

5. Commit and verify:
   ```sh
   git commit -m "message"
   git status
   ```

## What NOT to commit

- `.env` files or anything with secrets/API keys
- Planning documents, investigation notes, RFC drafts
- Build artifacts (`dist/`, `node_modules/`)
- Files generated during exploration that aren't part of the codebase

## Quality gate failures

Fix the issue first. Don't skip gates or use `--no-verify`. Each gate catches a different class of bug:
- Lint: syntax and style
- Typecheck: type safety
- Tests: behavioral regressions
- Build: runtime integration errors
