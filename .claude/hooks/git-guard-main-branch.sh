#!/bin/bash
# PreToolUse hook: Block Write/Edit on repo files when on main branch
#
# Non-repo files (e.g. ~/.claude/) are allowed. Fails closed on main if path can't be parsed.
# Matcher scopes this to Write|Edit tool calls only.
# file_path is always an absolute path with no escaping issues, so grep/sed is safe.

input=$(cat)

# Extract file_path from tool input
file_path=$(echo "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"//;s/"$//')

# If we couldn't extract a path, block to be safe on main
if [ -z "$file_path" ]; then
    [ "$(git branch --show-current)" = "main" ] && { echo 'Cannot edit on main branch' >&2; exit 2; }
    exit 0
fi

# Determine repo root — fail closed if unknown
repo_dir="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
if [ -z "$repo_dir" ]; then
    [ "$(git branch --show-current)" = "main" ] && { echo 'Cannot determine repo root on main branch' >&2; exit 2; }
    exit 0
fi

# Resolve symlinks on both paths to prevent bypass
file_path=$(realpath "$file_path" 2>/dev/null || echo "$file_path")
repo_dir=$(realpath "$repo_dir" 2>/dev/null || echo "$repo_dir")

# Only block if the file is inside the repo
case "$file_path" in
    "$repo_dir"/*)
        [ "$(git branch --show-current)" = "main" ] && { echo 'Cannot edit repo files on main branch' >&2; exit 2; }
        ;;
esac

exit 0
