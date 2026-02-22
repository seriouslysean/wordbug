---
description: Create a pull request for the current branch with quality gate verification
disable-model-invocation: true
allowed-tools: Bash(npm run lint:*), Bash(npm run typecheck:*), Bash(npm test:*), Bash(npm run build:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git push:*), Bash(gh pr create:*)
argument-hint: [optional: base branch, defaults to main]
---

Create a pull request for the current branch.

## Current state

- Branch: !`git branch --show-current`
- Git status: !`git status`
- Commits on this branch: !`git log --oneline main..HEAD 2>/dev/null || echo "Could not diff against main"`

## Steps

1. Verify working tree is clean. If there are uncommitted changes, commit them first (use /project:commit).

2. Run all quality gates:
   ```sh
   npm run lint && npm run typecheck && npm test && npm run build
   ```

3. Review the full scope of changes:
   ```sh
   git log --oneline main..HEAD
   git diff main...HEAD --stat
   ```

4. Push the branch if not already pushed:
   ```sh
   git push -u origin <branch-name>
   ```

5. Create the PR using `gh pr create`:
   ```sh
   gh pr create --title "Short descriptive title" --body "$(cat <<'EOF'
   ## Summary

   - What changed and why (1-3 bullet points)

   ## Test plan

   - [ ] Quality gates pass (lint, typecheck, test, build)
   - [ ] Relevant tests added or updated
   - [ ] Manual verification steps if applicable
   EOF
   )"
   ```

## PR guidelines

- **Title**: Under 72 characters, describes the change not the implementation
- **Summary**: Explain motivation, not just mechanics
- **Scope**: One concern per PR. Bug fix + refactor = two PRs
- **Tests**: New behavior needs tests. Bug fixes need regression tests
- **Docs**: Update `docs/technical.md` for architectural changes

## After creating

Return the PR URL so it can be reviewed.
