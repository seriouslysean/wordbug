#!/bin/bash
# PreToolUse hook: Block destructive git and filesystem commands
#
# Matcher scopes this to Bash tool calls. The input is the PreToolUse JSON
# (https://code.claude.com/docs/en/hooks): only tool_input.command is the
# command; tool_input.description, cwd and transcript_path are prose and paths
# that must not be matched.
#
# Blocking is exit 2 with the reason on stderr, which Claude reads as the
# denial reason. Any other non-zero exit lets the call proceed, so a failure
# to read the input also exits 2.
#
# This is a guard against the commands an agent plausibly writes, not a
# security boundary: `sh -c`, aliases and scripts are out of reach of any
# text match. It errs toward blocking, so quoted text that spells out a
# destructive command (a commit message, a heredoc) is blocked too; pass such
# text from a file instead (`git commit -F`).

block() {
    echo "$1" >&2
    exit 2
}

input=$(cat)

# jq when present, otherwise the Node.js this repository already requires
if command -v jq >/dev/null 2>&1; then
    command=$(printf '%s' "$input" | jq -r '.tool_input.command // empty') \
        || block "Could not read the Bash command from the hook input"
elif command -v node >/dev/null 2>&1; then
    command=$(printf '%s' "$input" | node -e '
        let text = "";
        process.stdin.on("data", chunk => { text += chunk; });
        process.stdin.on("end", () => process.stdout.write(JSON.parse(text).tool_input?.command ?? ""));
    ') || block "Could not read the Bash command from the hook input"
else
    block "The destructive-command hook needs jq or node on PATH to read its input"
fi

# True when the current segment matches the extended regex. Matched by bash
# itself: an external matcher that is missing would let every command through.
has() {
    [[ $segment =~ $1 ]]
}

# `git`, then the subcommand as a word anywhere after it. Global options and
# their values (-C <path>, --git-dir <dir>, -c <key=value>) are not parsed:
# a quoted or substituted value cannot be told from a word once the line is
# split, so anything may sit between the two.
git_sub() {
    has "(^|[^[:alnum:]_-])git[[:space:]]+(.*[[:space:]])?$1([^[:alnum:]_-]|\$)"
}

# A short option cluster holding the letter (-f, -fd, -xfd) or the long option
flag() {
    has "[[:space:]](-[a-zA-Z]*$1[a-zA-Z]*|--$2)([[:space:]]|\$)"
}

# A pathspec naming the whole tree
ALL_FILES='[[:space:]]\./?([[:space:]]|$)'

judge() {
    segment=$1

    # Quoting does not change what runs: git "reset" --hard, git checkout -- "."
    segment=${segment//[\"\']/}

    # The directory given to -C is not a pathspec: drop it, attached or not,
    # so `git -C . checkout main` is not read as `git checkout .`
    while [[ $segment =~ ^(.*[[:space:]])-C[[:space:]]*[^[:space:]]+(.*)$ ]]; do
        segment="${BASH_REMATCH[1]}${BASH_REMATCH[2]}"
    done

    # rm with recursive and force (-rf, -fr, -r -f, --recursive --force, mixed),
    # read from rm's own arguments so `grep -rf rm` is not taken for one
    if [[ $segment =~ (^|[^[:alnum:]_.-])rm([[:space:]].*)$ ]]; then
        command_line=$segment
        segment=${BASH_REMATCH[2]}
        if flag '[rR]' recursive && flag f force; then
            block "rm -rf permanently deletes files with no recovery — use git clean or be specific"
        fi
        segment=$command_line
    fi

    if git_sub reset && has '[[:space:]]--hard([[:space:]]|$)'; then
        block "git reset --hard discards all uncommitted changes permanently — use git stash to preserve them"
    fi

    # A dry run (-n, --dry-run) deletes nothing, whatever else is passed
    if git_sub clean && flag f force && ! flag n dry-run; then
        block "git clean -f permanently deletes untracked files — list them with git clean -n first"
    fi

    # --force and -f, and a +refspec, which forces that one ref.
    # --force-with-lease and --force-if-includes are different options and pass.
    if git_sub push && { flag f force || has '[[:space:]]\+[^[:space:]]'; }; then
        block "git push --force overwrites remote history and can destroy others' work — use --force-with-lease"
    fi

    if git_sub checkout && has "$ALL_FILES"; then
        block "git checkout . discards all unstaged changes across every file — be specific about which files to restore"
    fi

    if git_sub restore && has "$ALL_FILES"; then
        block "git restore . discards changes across all files — be specific about which files to restore"
    fi
}

# Runs judge on each line of its argument. The lines are peeled off with
# parameter expansion: a here-string needs a temporary file, and when that
# cannot be created the loop body never runs and nothing would be judged.
judge_lines() {
    local rest=$1
    while [[ -n $rest ]]; do
        judge "${rest%%$'\n'*}"
        [[ $rest == *$'\n'* ]] || break
        rest=${rest#*$'\n'}
    done
}

# A backslash at the end of a line continues the command on the next one
command=${command//\\$'\n'/ }

# Each command of a compound line is judged on its own, so one command's
# arguments (a --force-with-lease, a `.`) cannot excuse or condemn another.
# A redirect ends the arguments it follows: `git reset --hard>log`.
commands=$command
for separator in '&&' '||' ';' '|' '&' '<' '>'; do
    commands=${commands//"$separator"/$'\n'}
done
judge_lines "$commands"

# Substitutions and subshells are split too, so `$(git clean -f)` is seen.
# This is a second pass, not a replacement: splitting the outer command at a
# substitution would hide `git -C "$(pwd)" reset --hard` from the first.
inner=$commands
# shellcheck disable=SC2016 # the separators are literal text, not expansions
for separator in '$(' '`' '(' ')'; do
    inner=${inner//"$separator"/$'\n'}
done
judge_lines "$inner"

exit 0
