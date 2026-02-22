# CLI Tool Usage for Agents

Patterns for using external CLI tools efficiently. Every unnecessary flag, verbose output, or extra API call burns tokens and slows down the workflow.

## General Principles

**Diff locally, not remotely.** Git has the data. Don't fetch diffs from GitHub's API when `git diff` gives the same result with zero network cost.

**Filter at the source.** Use `--json` with field lists and `--jq` to get only what you need. A 50-token response beats a 5,000-token dump you have to parse.

**Combine calls.** One command that returns three fields is better than three commands that each return one.

## GitHub CLI (`gh`)

### PR and issue data

```sh
# Get only what you need — never fetch full PR objects
gh pr view 58 --json title,state,body --jq '.title'
gh pr list --json number,title,headRefName --jq '.[] | "\(.number) \(.title)"'

# Review comments with targeted fields
gh api repos/OWNER/REPO/pulls/58/comments --jq '.[].body'

# Combine into one call when possible
gh pr view 58 --json title,state,additions,deletions,changedFiles
```

### Avoid

```sh
# Don't do this — fetches everything including full diffs
gh pr view 58
gh api repos/OWNER/REPO/pulls/58

# Don't fetch remote diffs when you have the repo locally
gh pr diff 58          # Use: git diff main...HEAD
gh api .../pulls/58/files  # Use: git diff main...HEAD --stat
```

### Creating PRs and issues

```sh
# Use heredocs for multi-line bodies
gh pr create --title "Title" --body "$(cat <<'EOF'
Body content here
EOF
)"

# Use --fill-first with PR templates to avoid duplicating the template
gh pr create --title "Title" --fill-first
```

## Git

### Diff and log

```sh
# Scope diffs to what you need
git diff main...HEAD --stat            # File-level summary
git diff main...HEAD -- src/utils/     # Only specific paths
git log --oneline main..HEAD           # Commit list, not full details
git log --oneline -5                   # Recent history, bounded

# Don't dump full diffs unless you need to read the code
git diff                               # Only when reviewing actual changes
```

### Status

```sh
git status --short                     # Compact output
git status --short --branch            # Add branch info
```

## jq Patterns

Use `--jq` inline with `gh` rather than piping to a separate `jq` process when possible.

```sh
# Inline with gh (preferred)
gh pr list --json number,title --jq '.[].number'

# Pipe to jq only for complex transforms
gh api repos/OWNER/REPO/pulls --jq '[.[] | {number, title, user: .user.login}]'

# Extract specific nested fields
gh api repos/OWNER/REPO/actions/runs --jq '.workflow_runs[:3] | .[].conclusion'
```

## npm Scripts

```sh
# Run quality gates in sequence, stop on first failure
npm run lint && npm run typecheck && npm test && npm run build

# Run a specific test file (faster than full suite during iteration)
npx vitest run tests/utils/date-utils.spec.js
```
