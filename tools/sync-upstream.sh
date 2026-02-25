#!/usr/bin/env bash
# Syncs a downstream repo with the upstream occasional-wotd template.
# In the parent repo this is a no-op.
#
# Usage:
#   npm run tool:sync           # from a downstream repo
#   bash tools/sync-upstream.sh # direct invocation
#
# What it does:
#   1. Verifies an 'upstream' remote exists (downstream signal)
#   2. Fetches upstream/main
#   3. Rebases local main onto upstream/main
#   4. Resolves lockfile conflicts automatically (accept upstream + npm install)
#   5. Runs npm install to pick up any dependency changes
#
# Downstream repos diverge from upstream only in paths that upstream never
# touches: data/words/, public/images/social/, and favicon. These paths
# rebase cleanly since upstream uses data/demo/words/ via SOURCE_DIR.

set -euo pipefail

# Detect upstream remote
if ! git remote get-url upstream &>/dev/null; then
  echo "No 'upstream' remote found -- this is the parent repo. Nothing to sync."
  exit 0
fi

echo "Fetching upstream..."
git fetch upstream

# Check if we're already up to date
LOCAL=$(git rev-parse HEAD)
UPSTREAM=$(git rev-parse upstream/main)
MERGE_BASE=$(git merge-base HEAD upstream/main)

if [ "$MERGE_BASE" = "$UPSTREAM" ]; then
  echo "Already up to date with upstream/main."
  exit 0
fi

echo "Rebasing onto upstream/main..."
if git rebase upstream/main; then
  echo "Rebase succeeded."
else
  # Check if the only conflict is package-lock.json
  CONFLICTS=$(git diff --name-only --diff-filter=U 2>/dev/null || true)
  if [ "$CONFLICTS" = "package-lock.json" ]; then
    echo "Resolving lockfile conflict (accepting upstream version)..."
    git checkout --theirs package-lock.json
    git add package-lock.json
    git rebase --continue
  else
    echo "Rebase conflict in unexpected files:"
    echo "$CONFLICTS"
    echo ""
    echo "Resolve manually, then run: git rebase --continue"
    exit 1
  fi
fi

echo "Installing dependencies..."
npm install

echo "Sync complete. Run 'npm run build' to verify."
