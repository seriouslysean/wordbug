#!/bin/bash
# PreToolUse hook: Block file edits in this repository's checkouts on main
#
# Matcher scopes this to the file-editing tools (Write, Edit, NotebookEdit).
# The input is the PreToolUse JSON (https://code.claude.com/docs/en/hooks);
# tool_input.file_path is always absolute (notebook_path for NotebookEdit).
#
# The branch that matters is the one checked out where the file lives, not
# the one in the hook's working directory: CLAUDE_PROJECT_DIR stays at the
# session's starting root while agents work in worktrees under it, each on
# its own branch. Files outside this repository (e.g. ~/.claude/, another
# repository) are allowed.
#
# Blocking is exit 2 with the reason on stderr. Any other non-zero exit lets
# the edit proceed, so every failure to decide exits 2 when main is involved.

block() {
    echo "$1" >&2
    exit 2
}

on_main() {
    [ "$(git -C "$1" branch --show-current 2>/dev/null)" = "main" ]
}

# The repository a directory belongs to, shared by all of its worktrees
repository() {
    local common
    common=$(git -C "$1" rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || return 1
    (cd "$common" 2>/dev/null && pwd -P)
}

project_dir="${CLAUDE_PROJECT_DIR:-$PWD}"
input=$(cat)

# jq when present, otherwise the Node.js this repository already requires
if command -v jq >/dev/null 2>&1; then
    file_path=$(printf '%s' "$input" | jq -r '.tool_input | .file_path // .notebook_path // empty')
elif command -v node >/dev/null 2>&1; then
    file_path=$(printf '%s' "$input" | node -e '
        let text = "";
        process.stdin.on("data", chunk => { text += chunk; });
        process.stdin.on("end", () => {
            const toolInput = JSON.parse(text).tool_input;
            process.stdout.write(toolInput?.file_path ?? toolInput?.notebook_path ?? "");
        });
    ')
else
    file_path=""
fi

# If we couldn't extract a path, block to be safe on main
if [ -z "$file_path" ]; then
    on_main "$project_dir" && block "Cannot edit on main branch: the file path could not be read from the hook input"
    exit 0
fi

# Resolve a symlinked file so a link from outside the repository is judged by its target
file_path=$(realpath "$file_path" 2>/dev/null || echo "$file_path")

# A new file's directory may not exist yet: judge by the nearest one that does
dir=$(dirname "$file_path")
while [ ! -d "$dir" ] && [ "$dir" != "/" ] && [ "$dir" != "." ]; do
    dir=$(dirname "$dir")
done

# Files outside any repository are not ours to guard
git -C "$dir" rev-parse --git-dir >/dev/null 2>&1 || exit 0

# Only block files inside this repository; when either side cannot be
# identified, the file is treated as ours
file_repository=$(repository "$dir")
project_repository=$(repository "$project_dir")
if [ -n "$file_repository" ] && [ -n "$project_repository" ] && [ "$file_repository" != "$project_repository" ]; then
    exit 0
fi

on_main "$dir" && block "Cannot edit repo files on main branch: switch to a feature branch first"

exit 0
