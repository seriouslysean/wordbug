Commit the current changes following this project's conventions.

## Steps

1. Run quality gates in order. Stop if any fail:
   ```sh
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

2. Check what changed:
   - Run `git status` to see all modified, staged, and untracked files
   - Run `git diff` to review changes
   - Identify files that should NOT be committed: `.env`, credentials, planning docs, investigation notes, temporary files

3. Stage files explicitly by name. Never use `git add -A` or `git add .`:
   ```sh
   git add <file1> <file2> ...
   ```

4. Write a commit message that explains the WHY, not the what. Format:
   - First line: concise summary (imperative mood, under 72 chars)
   - Blank line
   - Body: explain motivation and context if the change isn't obvious
   - Keep it honest about what actually changed

5. Commit:
   ```sh
   git commit -m "Summary of why this change was made

   Additional context if needed."
   ```

6. Verify with `git status` that the working tree is clean (or only has intentionally unstaged files).

## What NOT to commit

- `.env` files or anything with secrets/API keys
- Planning documents, investigation notes, RFC drafts
- Build artifacts (`dist/`, `node_modules/`)
- Files generated during exploration that aren't part of the codebase

## Quality gate failures

If a gate fails, fix the issue first. Don't skip gates or use `--no-verify`. The gates exist because each catches a different class of bug:
- Lint: syntax and style problems
- Typecheck: type safety violations
- Tests: behavioral regressions
- Build: runtime integration errors
