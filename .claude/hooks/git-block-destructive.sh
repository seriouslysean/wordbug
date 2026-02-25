#!/bin/bash
# PreToolUse hook: Block destructive git and filesystem commands
#
# Matcher scopes this to Bash tool calls only. The command is the only
# meaningful text in the input, so we regex the raw input — no JSON parsing needed.

input=$(cat)

blocked=false
reason=""

# rm with recursive and force (short: -rf, -fr, -r -f; long: --recursive --force; mixed)
if echo "$input" | grep -qE '\brm\b' && \
   (echo "$input" | grep -qE '\s-[a-zA-Z]*[rR][a-zA-Z]*[fF]' || \
    echo "$input" | grep -qE '\s-[a-zA-Z]*[fF][a-zA-Z]*[rR]' || \
    (echo "$input" | grep -qE '(\s-[a-zA-Z]*[rR]\b|\s--recursive\b)' && \
     echo "$input" | grep -qE '(\s-[a-zA-Z]*[fF]\b|\s--force\b)')); then
    blocked=true
    reason="rm -rf permanently deletes files with no recovery — use git clean or be specific"
fi

# git reset --hard
if echo "$input" | grep -qE 'git\s+reset\s+--hard'; then
    blocked=true
    reason="git reset --hard discards all uncommitted changes permanently — use git stash to preserve them"
fi

# git clean with force (catches -f, -df, -d -f, --force, etc.)
if echo "$input" | grep -qE 'git\s+clean\b' && \
   (echo "$input" | grep -qE '\s-[a-zA-Z]*f\b' || echo "$input" | grep -q '\--force'); then
    blocked=true
    reason="git clean -f permanently deletes untracked files — list them with git clean -n first"
fi

# git push --force or -f (but allow --force-with-lease)
if echo "$input" | grep -qE 'git\s+push\b' && \
   echo "$input" | grep -qE '(\s|^)(-f|--force)\b' && \
   ! echo "$input" | grep -q '\--force-with-lease'; then
    blocked=true
    reason="git push --force overwrites remote history and can destroy others' work — use --force-with-lease"
fi

# git checkout . or git checkout -- . (discard all changes)
if echo "$input" | grep -qE 'git\s+checkout\s+(--\s+)?\.(\s|$|["'"'"'\\])'; then
    blocked=true
    reason="git checkout . discards all unstaged changes across every file — be specific about which files to restore"
fi

# git restore . or git restore --staged . (modern equivalent of git checkout .)
if echo "$input" | grep -qE 'git\s+restore\s+' && \
   echo "$input" | grep -qE '(\s|^)\.(\s|$|["'"'"'\\])'; then
    blocked=true
    reason="git restore . discards changes across all files — be specific about which files to restore"
fi

if [ "$blocked" = true ]; then
    cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "$reason"
  }
}
EOF
fi
