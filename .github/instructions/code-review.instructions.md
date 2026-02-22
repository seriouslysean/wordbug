---
description: "Code review focus areas, severity labels, and exclusions for Copilot code review"
applyTo: "**"
excludeAgent: ["coding-agent"]
---

# Code Review Instructions

## Severity Labels

Prefix every review comment with a severity label. This follows [Google's engineering practices for code review](https://google.github.io/eng-practices/review/reviewer/standard.html):

- **nit**: Minor style or preference issue. Non-blocking. Reviewer would not object if ignored.
- **optional**: Suggestion the author may want to consider. Non-blocking.
- **suggestion**: Recommended improvement. The reviewer believes this would make the code better but it is not critical.
- **issue**: A real problem that should be fixed before merging. Blocking.
- **blocker**: A critical problem (correctness, security, boundary violation) that must be fixed. Blocking.

## Review Focus

When performing a code review, prioritize these areas in order:

1. **Correctness**: Logic errors, incorrect behavior, off-by-one errors, data corruption risks
2. **The Boundary**: Files in `utils/` must never import from `src/utils/` or `astro:*` — this silently breaks CLI tools
3. **Type safety**: `as` assertions hiding real type mismatches, `any` types, unchecked indexed access
4. **Interaction with changed code**: Verify that callers and callees of changed functions still work correctly with the new signatures or behavior
5. **Security**: Exposed secrets, input validation gaps at system boundaries

## Out of Scope

When performing a code review, do not flag or comment on:

- TODO, FIXME, HACK, or XXX comments — these are intentional markers for tracked work
- Style issues already enforced by oxlint (formatting, import ordering, whitespace)
- Missing features or enhancements beyond the scope of the change
- Test coverage for unchanged code
