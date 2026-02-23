---
description: Run the full quality gate pipeline and verify the project is in a healthy state. Use this after making code changes to catch issues early.
allowed-tools: Bash(npm run lint:*), Bash(npm run lint\:fix:*), Bash(npm run typecheck:*), Bash(npm test:*), Bash(npx vitest run:*), Bash(npm run build:*), Bash(npm run test\:e2e:*), Bash(npx playwright:*)
---

Validate the project by running the quality gate pipeline. Each gate catches a different class of issue — run them in order and stop at the first failure.

## Gate 1: Lint (syntax and style)

```sh
npm run lint
```

**What passing looks like:** `Found 0 warnings and 0 errors`

**If it fails:** Run `npm run lint:fix` to auto-fix. If issues remain, they need manual attention. oxlint errors are real code problems (unused variables, unreachable code, style violations).

## Gate 2: Type check (type safety)

```sh
npm run typecheck
```

**What passing looks like:** `Result (N files): - 0 errors - 0 warnings - 0 hints`

This runs `astro check` which includes both TypeScript compilation and Astro-specific diagnostics. Common issues:
- Missing null checks (strict null checks are enabled)
- Unsafe indexed access (`noUncheckedIndexedAccess` is on — array/object index results are `T | undefined`)
- Import alias errors (using relative paths instead of `#` aliases)
- Boundary violations (`utils/` importing from `#astro-utils/*`)

## Gate 3: Tests (behavioral correctness)

```sh
npm test
```

**What passing looks like:** All test files pass, coverage thresholds met:
- Lines: 80%
- Functions: 80%
- Branches: 85%
- Statements: 80%

The test suite has four layers. If a specific layer fails, it tells you what kind of problem you have:
- **Unit tests** (`tests/utils/`, `tests/adapters/`) — pure function logic is wrong
- **Component tests** (`tests/src/`) — Astro wrapper behavior is wrong
- **Architecture tests** (`tests/architecture/`) — you crossed the utils/ boundary
- **CLI integration tests** (`tests/tools/`) — an import chain pulls in `astro:*` outside Astro

**If tests fail:** Read the failure message. Fix the code, not the test (unless the test expectation is genuinely wrong). Run the specific failing test in isolation to iterate faster: `npx vitest run tests/path/to/file.spec.js`

## Gate 4: Build (full integration)

```sh
npm run build
```

**What passing looks like:** `[build] N page(s) built in Xs` followed by `[build] Complete!`

The build catches problems that lint and type checking miss: runtime evaluation errors, missing environment variable defaults, Content Collections loading failures, and template rendering errors. It builds without `.env` using defaults — if it fails, a required value is missing its default in `astro.config.ts`.

## Gate 5: E2E tests (end-to-end)

```sh
npm run test:e2e
```

**Prerequisites:** Gate 4 (build) must pass first. E2E tests run Playwright against the built `dist/` output via `npm run preview`.

**What passing looks like:** All Playwright tests pass across navigation, SEO, and accessibility specs.

E2E tests validate the built site as a user would experience it:
- **Navigation** (`navigation.spec.ts`) — user journeys: discover and navigate between words, browse by year, footer section links; 404 handling
- **SEO** (`seo.spec.ts`) — meta tags present in rendered HTML (description, canonical, OpenGraph, Twitter), JSON-LD parseable, RSS and sitemap discoverable
- **Accessibility** (`accessibility.spec.ts`) — skip-to-content keyboard flow, document language and viewport, image alt text, link accessible text

**Design principles:**
- Test elements and interactions, not strings. No hardcoded word URLs — discover content through navigation
- No overlap with unit tests. Unit tests validate generation logic; E2E validates the rendered output
- E2E always runs in demo mode (no `BASE_PATH`, `SOURCE_DIR=demo`). The CI workflow skips `setup-env` intentionally — production env vars like `BASE_PATH` would break test selectors

**If tests fail:** Run a specific spec to iterate faster: `npx playwright test tests/e2e/navigation.spec.ts`. Use `--headed` for a visible browser. Check that `dist/` exists and was built with demo defaults (no `BASE_PATH`).

## Summary

If all five gates pass, the project is healthy. If you changed code, you should also verify that no existing behavior was broken by reviewing the test output carefully — passing tests with reduced coverage may indicate you removed test-covered code.
