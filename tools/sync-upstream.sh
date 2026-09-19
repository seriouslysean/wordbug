#!/usr/bin/env bash
# Brings upstream occasional-wotd changes into a downstream repo on a new
# branch, and commits the merge only after every quality gate passes on it.
# In the parent repo, which has no 'upstream' remote, this is a no-op.
#
# Usage, from the root of a downstream repo with main checked out and clean:
#   npm run tool:sync                    # every gate, E2E included
#   npm run tool:sync -- --skip-e2e      # when Playwright browsers are not installed
#
# What it does:
#   1. Refuses to start off the repository root, off main, during a merge or
#      rebase, or with modified, staged or untracked files. Ignored files such
#      as .env are fine. Nothing is ever stashed.
#   2. Fetches upstream and stops if main already contains upstream/main
#   3. Creates sync/upstream-<short sha> from main and merges upstream/main
#      into it with --no-ff --no-commit, so even a fast-forward stops before a
#      commit exists
#   4. Takes upstream's package-lock.json when it is the only conflict and the
#      merged package.json is upstream's; any other conflict stops the sync
#   5. Installs with npm ci and runs the AGENTS.md quality gates in order:
#      lint, typecheck, test, the demo build, E2E
#   6. Commits the merge once the gates pass without changing any file
#
# It never pushes and never touches main. On success the sync branch is left
# checked out for review. Merge, not rebase, so main can be pushed without
# force once the branch is merged into it.

set -euo pipefail

USAGE="Usage: npm run tool:sync [-- --skip-e2e]"

SKIP_E2E=false
for arg in "$@"; do
  case "$arg" in
    --skip-e2e) SKIP_E2E=true ;;
    -h | --help)
      echo "$USAGE"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "$USAGE" >&2
      exit 1
      ;;
  esac
done

# Prints each argument as a line on stderr and stops
fail() {
  printf '%s\n' "$@" >&2
  exit 1
}

if ! git remote get-url upstream &>/dev/null; then
  echo "No 'upstream' remote found -- this is the parent repo. Nothing to sync."
  exit 0
fi

if [[ "$(git rev-parse --show-toplevel)" != "$(pwd -P)" ]]; then
  fail "Run the sync from the repository root."
fi

if [[ "$(git symbolic-ref --quiet --short HEAD || true)" != main ]]; then
  fail "Check out main before syncing."
fi

if git rev-parse --quiet --verify MERGE_HEAD >/dev/null ||
  [[ -e "$(git rev-parse --git-path rebase-merge)" || -e "$(git rev-parse --git-path rebase-apply)" ]]; then
  fail "A merge or rebase is in progress. Finish or abort it before syncing."
fi

# --untracked-files=all overrides a status.showUntrackedFiles=no setting.
# Ignored files such as .env are never listed.
if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
  fail "Modified, staged or untracked files are present. Commit or remove them first; the sync never stashes."
fi

echo "Fetching upstream..."
git fetch upstream --no-tags

if git merge-base --is-ancestor upstream/main HEAD; then
  echo "Already up to date with upstream/main."
  exit 0
fi

BRANCH="sync/upstream-$(git rev-parse --short upstream/main)"
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  fail "Branch $BRANCH already exists. Finish or delete it before syncing again."
fi

ABANDON="To abandon the sync: git merge --abort && git switch main && git branch -D $BRANCH"

git switch --quiet --create "$BRANCH"

echo "Merging upstream/main into $BRANCH..."
if ! git merge --no-ff --no-commit upstream/main; then
  CONFLICTS=$(git diff --name-only --diff-filter=U)
  if [[ "$CONFLICTS" != package-lock.json ]]; then
    fail "" "The merge stopped with conflicts on $BRANCH:" "$CONFLICTS" "" \
      "Resolve them, run every quality gate, then commit." "$ABANDON"
  fi

  # Upstream's lockfile only describes upstream's manifest
  if ! git diff --quiet upstream/main -- package.json; then
    fail "" "package-lock.json conflicts on $BRANCH and the merged package.json differs from upstream's," \
      "so upstream's lockfile would not match it. Resolve both by hand, run every quality gate, then commit." \
      "$ABANDON"
  fi

  echo "Taking upstream's package-lock.json: the merged package.json is upstream's."
  git checkout --theirs -- package-lock.json
  git add -- package-lock.json
fi

# Runs one gate, and stops with the merge staged but uncommitted if it fails
gate() {
  echo ""
  echo "> $*"
  if ! "$@"; then
    fail "" "Failed: $*" "The merge is staged on $BRANCH but not committed, and main is unchanged." \
      "Fix it there, run every quality gate, then commit." "$ABANDON"
  fi
}

gate npm ci
gate npm run lint
gate npm run typecheck
gate npm test
# The demo site at the root path, as the E2E workflow builds it, whatever a
# local .env sets
gate env SOURCE_DIR=demo BASE_PATH=/ npm run build
if [[ "$SKIP_E2E" == true ]]; then
  echo ""
  echo "Skipping E2E (--skip-e2e)."
else
  gate env SOURCE_DIR=demo BASE_PATH=/ npm run test:e2e
fi

# What the gates wrote must not end up in the merge commit
if ! git diff --quiet || [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
  git status --short >&2
  fail "" "The gates changed or added the files above, so the merge was not committed." \
    "Inspect them on $BRANCH." "$ABANDON"
fi

git commit --quiet --no-edit

echo ""
echo "Merged upstream/main into $BRANCH after every gate passed. Nothing was pushed and main is unchanged."
# origin by name: in a clone made with -o upstream, main tracks upstream
echo "To publish: git switch main && git merge --ff-only $BRANCH && git push origin main"
