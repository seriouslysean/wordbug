---
name: validate
description: Runs this repository's five quality gates in order (lint, typecheck, unit tests with coverage, build, E2E) and diagnoses the first failure. Use after changing code, before committing or opening a pull request, or when asked whether the project is healthy.
# allowed-tools is experimental in the Agent Skills spec; the Bash(...) rules are Claude Code's syntax
allowed-tools: Bash(npm run lint:*) Bash(npm run lint:fix:*) Bash(npm run typecheck:*) Bash(npm test:*) Bash(npx vitest run:*) Bash(npm run build:*) Bash(npm run test:e2e:*) Bash(npx playwright test:*)
---

Run the quality gates and report which passed. The gates, their order and what counts as passing are defined in the Quality Gates section of `AGENTS.md` at the repository root; this skill adds how to read a failure.

Run them in order and stop at the first failure: each gate assumes the ones before it, so a later failure is often noise from an earlier one. Fix the cause, rerun the failed gate, then continue. A gate passes when its command exits 0.

| Gate | Command | A failure usually means | Iterate with |
|------|---------|-------------------------|--------------|
| 1. Lint | `npm run lint` | A real code problem oxlint found (unused variable, `let` that should be `const`, a type assertion) | `npm run lint:fix`, then fix what remains by hand |
| 2. Typecheck | `npm run typecheck` | A missing null check, an unchecked indexed access (`T \| undefined`), or a `#` alias that does not resolve | The file and line in the diagnostic |
| 3. Tests | `npm test` | See the layers below; a coverage failure with every test green means covered code lost its tests | `npx vitest run tests/path/to/file.spec.ts` |
| 4. Build | `npm run build` | Something only evaluation reveals: a Content Collections load failure, a template error, or a value with no default in `astro.config.ts` (the build runs without `.env`) | The first error in the build log |
| 5. E2E | `npm run test:e2e` | The assembled site is wrong in a browser: a link that does not resolve, a missing meta tag, broken keyboard flow | `npx playwright test tests/e2e/<name>.spec.ts` |

## Reading a test failure

The directory of the failing spec says what kind of problem it is:

- `tests/utils/`, `tests/adapters/`: pure function logic is wrong
- `tests/src/`: an Astro wrapper misbehaves
- `tests/architecture/`: a structural rule was broken, most often an import across the boundary (code outside `src/` importing `#astro-utils/*` or `astro:*`)
- `tests/tools/`: a CLI tool fails as a real process, often because its import chain reaches an Astro-only module

Fix the code, not the test, unless the test's expectation is what changed.

## Build and E2E specifics

- Where the words live under `data/demo/` and there is no `data/words/` (the upstream template), the build needs the demo dataset named: `SOURCE_DIR=demo npm run build`, as the E2E workflow does. Without it, and with no `.env` setting it, the build stops at `Word not found`. A site repository with its own `data/words/` runs `npm run build` as is.
- Gate 4 must have passed first: Playwright serves the built `dist/` through its own preview server and never reuses a running one.
- E2E expects the site at the root path. A `dist/` built with `BASE_PATH` set fails selectors for reasons unrelated to the change.
- If the preview server cannot start, another process holds its port: see Local Development Notes in `docs/agents/backlog.md`.

## Report

State each gate run and its result, and name any gate not run and why. Passing tests with lower coverage than before deserve a mention even when the thresholds still hold.
