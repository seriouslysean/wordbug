---
description: Commit changes following project conventions (runs validation, explicit staging, why-not-what messages)
allowed-tools: Bash(npm run lint:*), Bash(npm run lint\:fix:*), Bash(npm run typecheck:*), Bash(npm test:*), Bash(npx vitest run:*), Bash(npm run build:*), Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*)
argument-hint: [optional commit message hint]
---

Commit the current changes following this project's conventions.

## Current state

- Git status: !`git status`
- Recent commits (for message style): !`git log --oneline -5`

## Steps

1. **Validate first.** Run the full quality gate pipeline (`/project:validate`). Stop and fix if any gate fails. Don't skip gates or use `--no-verify`.

2. **Review changes.** Check `git diff` for both staged and unstaged changes. Look for:
   - Files that should NOT be committed: `.env`, credentials, planning docs, investigation notes, temporary files, build artifacts
   - Accidental debug code, TODO markers, or commented-out blocks

3. **Stage explicitly.** Add files by name. Never `git add -A` or `git add .`:
   ```sh
   git add <file1> <file2> ...
   ```

4. **Write the message.** Use [Conventional Commits](https://www.conventionalcommits.org/) with imperative mood:
   - Format: `type: imperative summary` (under 72 chars)
   - Types: `feat` (new feature), `fix` (bug fix), `chore` (maintenance, deps, config), `refactor` (no behavior change), `docs` (documentation only), `test` (test-only changes)
   - Imperative mood: "add support for X", not "added support for X"
   - Optional body after blank line with motivation and context
   - If the user provided a hint via $ARGUMENTS, incorporate it

5. **Commit and verify:**
   ```sh
   git commit -m "message"
   git status
   ```
