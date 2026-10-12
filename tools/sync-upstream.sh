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
#   6. Builds the repository's own words (SOURCE_DIR empty, so data/words)
#      when it tracks any: typecheck holds them to the collection schema, and
#      nothing above renders them. A .env supplies the site's settings and
#      astro.config.ts's defaults stand in without one
#   7. Dry-runs the stored-word normalizer over those words and reports what
#      it would rewrite. Nothing is written, and the report is never a gate
#   8. Commits the merge once the gates pass without changing any file, and
#      fails if a commit hook then changes what was committed
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

# The build and E2E above read the demo words. Typecheck reads this
# repository's own, but only against the collection schema (astro check,
# with SOURCE_DIR unset), so a stored word the schema accepts and a page
# cannot render would first fail in Deploy, after the push. This builds what
# Deploy builds. Last of the gates, since it replaces the dist/ that E2E
# serves. A repository that tracks no words of its own, such as a
# copy that has not added its first, has nothing to build, and the build
# fails without a word.
NORMALIZE_REPORT=""
if [[ -z "$(git ls-files -- 'data/words/*.json')" ]]; then
  echo ""
  echo "Skipping the own-words build: nothing is tracked under data/words."
else
  if [[ ! -e .env ]]; then
    echo ""
    echo "No .env here, so the own-words build uses the default site settings in astro.config.ts."
  fi
  # Set and empty selects data/words and, being set, wins over a .env value
  gate env SOURCE_DIR= npm run build

  # A release can change the stored format without rejecting the old one,
  # which the build above then accepts. Reported, never fixed here: the
  # rewrite is the owner's commit.
  NORMALIZE="npm run tool:normalize-word-data"
  echo ""
  echo "> env SOURCE_DIR= $NORMALIZE -- --dry-run"
  if NORMALIZE_OUTPUT=$(env SOURCE_DIR= $NORMALIZE -- --dry-run 2>&1); then
    WOULD_CHANGE=$(grep -c 'Would normalize word file' <<< "$NORMALIZE_OUTPUT" || true)
    if [[ "$WOULD_CHANGE" -gt 0 ]]; then
      NORMALIZE_REPORT="The normalizer would rewrite $WOULD_CHANGE stored word file(s) under data/words; the sync changed none of them.
To see them: env SOURCE_DIR= $NORMALIZE -- --dry-run
To rewrite them: env SOURCE_DIR= $NORMALIZE, then review and commit the result."
    else
      NORMALIZE_REPORT="The normalizer would change no stored word."
    fi
  else
    NORMALIZE_REPORT="The normalizer could not check every stored word, so whether any needs rewriting is unknown.
To see why: env SOURCE_DIR= $NORMALIZE -- --dry-run"
  fi
  echo "$NORMALIZE_REPORT"
fi

# What the gates wrote must not end up in the merge commit
if ! git diff --quiet || [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
  git status --short >&2
  fail "" "The gates changed or added the files above, so the merge was not committed." \
    "Inspect them on $BRANCH." "$ABANDON"
fi

# Commit hooks run after the check above. One that refuses the commit, or
# that rewrites and stages a file (a lint hook that fixes), must not pass for
# a merge every gate has seen.
GATED_TREE=$(git write-tree)
if ! git commit --quiet --no-edit; then
  fail "" "The gates passed but the merge could not be committed on $BRANCH; a commit hook may have refused it." \
    "The merge is still staged there, and main is unchanged." "$ABANDON"
fi
if [[ "$(git rev-parse 'HEAD^{tree}')" != "$GATED_TREE" ]]; then
  git diff --stat "$GATED_TREE" HEAD >&2
  fail "" "A commit hook changed the files above while committing the merge on $BRANCH," \
    "so the commit holds changes no gate has run on. Run every quality gate there before merging it into main." \
    "To abandon the sync: git switch main && git branch -D $BRANCH"
fi

echo ""
echo "Merged upstream/main into $BRANCH after every gate passed. Nothing was pushed and main is unchanged."
if [[ -n "$NORMALIZE_REPORT" ]]; then
  echo "$NORMALIZE_REPORT"
fi
# origin by name: in a clone made with -o upstream, main tracks upstream
echo "To publish: git switch main && git merge --ff-only $BRANCH && git push origin main"
