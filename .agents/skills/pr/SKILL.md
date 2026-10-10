---
name: pr
description: Opens a GitHub pull request for the current branch - validates, pushes, and fills the repository's PR template from the whole branch diff. Use only when the user explicitly asks to open or create a pull request.
# Pushing and opening a PR are visible to others, so the user decides when:
# disable-model-invocation (Claude Code only) keeps the skill out of Claude's
# own reach, and agents/openai.yaml does the same for Codex. argument-hint is
# Claude Code only. allowed-tools is experimental in the Agent Skills spec;
# the Bash(...) rules are Claude Code's syntax.
disable-model-invocation: true
argument-hint: "[optional base branch, defaults to main]"
allowed-tools: Bash(npm run lint:*) Bash(npm run typecheck:*) Bash(npm test:*) Bash(npm run build:*) Bash(git status:*) Bash(git branch --show-current) Bash(git diff:*) Bash(git log:*) Bash(git push:*) Bash(gh pr create:*)
---

Open a pull request for the current branch.

Base branch: `main`, unless the user named another one: $ARGUMENTS

## Current state

Claude Code replaces each command below with its output when the skill loads; in another agent, run them first.

- Branch: !`git branch --show-current`
- Git status: !`git status --short --branch`
- Commits not on main: !`git log --oneline main..HEAD 2>/dev/null || echo "Could not diff against main"`

## Steps

1. **Start from a clean feature branch.** Commit any uncommitted work first with the `commit` skill. If the current branch is the base branch, stop and ask which branch the work belongs on.

2. **Validate.** Run the quality gates with the `validate` skill; every gate passes before anything is pushed.

3. **Read the whole branch.** The PR is every commit since the base, not the latest one:
   ```sh
   git log --oneline <base>..HEAD
   git diff <base>...HEAD --stat
   git diff <base>...HEAD
   ```

4. **Write the body from the template.** Read `.github/pull_request_template.md` and keep its headings and checklist as they are; GitHub's web UI starts from the same file. Replace the comment under Summary with one to three bullets covering what changed across the branch and why. Tick a checklist item only if it was done; leave the rest unticked.

5. **Push** the branch if the remote does not have these commits: `git push -u origin <branch>`.

6. **Create the PR**, passing the body from a file. Write the filled-in template to a file outside the repository with the file-writing tool, then:
   ```sh
   gh pr create --base <base> --title "type: short imperative title" --body-file <path>
   ```
   `--fill` and `--fill-first` take the title and body from commit messages, so the template would be skipped. A body passed inline or through a heredoc becomes part of the command line, where the safety hook blocks any line that quotes a destructive command.

## Guidelines

- **Title**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `ci:`), imperative mood, under 72 characters
- **Scope**: one concern per PR; it can span several commits that serve the same goal. If the branch holds unrelated work, say so before opening it
- **Tests and docs**: new behavior comes with tests and a bug fix with a regression test; architectural changes update `docs/technical.md`. If either is missing, say so in the body instead of ticking the box

Finish by giving the user the PR URL.
