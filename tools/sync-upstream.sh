#!/usr/bin/env bash
# Syncs a downstream repo with the upstream occasional-wotd template.
# In the parent repo this is a no-op.
#
# Usage:
#   npm run tool:sync           # from a downstream repo
#   ./tools/sync-upstream.sh    # direct invocation
#
# What it does:
#   1. Verifies an 'upstream' remote exists (downstream signal)
#   2. Fetches upstream/main
#   3. Merges upstream/main into local main
#   4. Resolves lockfile conflicts automatically (accept upstream + npm install)
#   5. Runs npm install to pick up any dependency changes
#
# Uses merge (not rebase) so downstream can regular-push without force.
# Downstream repos diverge from upstream only in paths that upstream never
# touches: data/words/, public/images/social/, and favicon. These paths
# merge cleanly since upstream uses data/demo/words/ via SOURCE_DIR.

set -euo pipefail

# Detect upstream remote
if ! git remote get-url upstream &>/dev/null; then
  echo "No 'upstream' remote found -- this is the parent repo. Nothing to sync."
  exit 0
fi

echo "Fetching upstream..."
git fetch upstream

# Check if we're already up to date
UPSTREAM=$(git rev-parse upstream/main)
MERGE_BASE=$(git merge-base HEAD upstream/main)

if [ "$MERGE_BASE" = "$UPSTREAM" ]; then
  echo "Already up to date with upstream/main."
  exit 0
fi

echo "Merging upstream/main..."
if git merge upstream/main --no-edit; then
  echo "Merge succeeded."
else
  # Check if the only conflict is package-lock.json
  CONFLICTS=$(git diff --name-only --diff-filter=U 2>/dev/null || true)
  if [ "$CONFLICTS" = "package-lock.json" ]; then
    echo "Resolving lockfile conflict (accepting upstream version)..."
    git checkout --theirs package-lock.json
    npm install
    git add package-lock.json
    git commit --no-edit
  else
    echo "Merge conflict in unexpected files:"
    echo "$CONFLICTS"
    echo ""
    echo "Resolve manually, then commit."
    exit 1
  fi
fi

echo "Installing dependencies..."
npm install

echo "Sync complete. Run 'npm run build' to verify."
