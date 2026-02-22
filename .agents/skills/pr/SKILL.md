---
description: Create a pull request for the current branch with validation and proper formatting
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

1. **Clean working tree.** If there are uncommitted changes, commit them first (use `/project:commit`).

2. **Validate.** Run the full quality gate pipeline (`/project:validate`). All gates must pass.

3. **Review scope.** Look at all commits and changes that will be in the PR:
   ```sh
   git log --oneline main..HEAD
   git diff main...HEAD --stat
   ```

4. **Push** if not already pushed:
   ```sh
   git push -u origin <branch-name>
   ```

5. **Create PR** using `gh pr create`:
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

## Guidelines

- **Title**: Under 72 chars, describes the change not the implementation
- **Scope**: One concern per PR. Bug fix + refactor = two PRs
- **Tests**: New behavior needs tests. Bug fixes need regression tests
- **Docs**: Update `docs/technical.md` for architectural changes

Return the PR URL when done.
