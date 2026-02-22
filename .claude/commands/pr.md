Create a pull request for the current branch. Argument: $ARGUMENTS (optional: base branch, defaults to main).

## Steps

1. Run all quality gates first:
   ```sh
   npm run lint && npm run typecheck && npm test && npm run build
   ```

2. Check the current state:
   - `git status` — ensure working tree is clean (commit or stash changes first)
   - `git log --oneline main..HEAD` — review all commits that will be in the PR
   - `git diff main...HEAD --stat` — see the full scope of changes

3. Push the branch if not already pushed:
   ```sh
   git push -u origin <branch-name>
   ```

4. Create the PR with `gh pr create`. Use this format:
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

- **Title**: Under 72 characters, describes the change (not the implementation)
- **Summary**: Explain the motivation, not just the mechanics
- **Scope**: One concern per PR. If you're fixing a bug AND refactoring, split them
- **Tests**: New behavior needs new tests. Bug fixes need regression tests
- **Documentation**: Update `docs/technical.md` for architectural changes

## After creating

Return the PR URL so it can be reviewed.
