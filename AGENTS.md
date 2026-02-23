# AGENTS.md

Guidance for AI agents working in this repository. This is the canonical source — `CLAUDE.md` symlinks here, and `.github/copilot-instructions.md` contains a distilled version for GitHub Copilot.

## Project Overview

Static site generator (Astro) for word-of-the-day websites. Powers multiple child sites via environment-driven configuration. All pages pre-rendered at build time with zero client-side JavaScript by default.

## Setup & Commands

Node.js 24+ required (`.nvmrc` provided). No `.env` needed — defaults use `SOURCE_DIR=demo`.

```sh
nvm use && npm install             # Setup
npm run dev                        # Dev server
npm run build                      # Production build
npm run typecheck                  # TypeScript + Astro check
npm test                           # Unit/component tests with coverage
npm run test:e2e                   # E2E tests (requires build first)
npm run lint                       # oxlint check
npm run lint:fix                   # oxlint auto-fix

# CLI tools:
npm run tool:local tools/add-word.ts serendipity
npm run tool:local tools/generate-images.ts --all
```

Pre-commit hooks (husky + lint-staged) run `oxlint --fix` and related tests on staged files.

## Philosophy

These are the principles behind every decision in this codebase. Understand the why and the what follows naturally.

### Simplicity is the feature

This is a static site. Before adding build optimizations, caching layers, or abstraction frameworks, ask: does this change what the user actually sees? Astro and Vite handle most optimizations automatically. The right amount of complexity is the minimum needed for the current task. Three similar lines of code is better than a premature abstraction.

Don't add features, refactoring, or "improvements" beyond what was asked. A bug fix doesn't need surrounding code cleaned up. Don't add error handling for scenarios that can't happen. Don't create abstractions for one-time operations. Don't design for hypothetical future requirements.

### One source of truth

Every piece of knowledge lives in exactly one place:

- **Import aliases** — `package.json` `imports` field (TypeScript and Vite follow it)
- **Environment validation** — `astro.config.ts` (don't duplicate elsewhere)
- **Business logic** — `utils/` pure functions (Astro wrappers in `src/utils/` delegate, never duplicate)
- **Stats definitions** — `constants/stats.ts`
- **URL patterns** — `constants/urls.ts`

When you need shared logic, put the pure function in `utils/` and create a thin wrapper in `src/utils/` that delegates to it. The wrapper adds framework context (caching, default collections). It never re-implements the logic.

### Automate the rules

`.editorconfig` handles formatting. `.oxlintrc.json` handles lint rules. `tsconfig.json` handles type safety. Architecture tests in `tests/architecture/` enforce import boundaries. If a pattern should be consistent, encode it in tooling — don't rely on memory. Run `npm run lint:fix` after adding new lint rules.

### Adapters are pass-throughs

External API adapters (`adapters/`) look up exactly what they're given and report exactly what they get back. Case normalization, retries, fallback strategies, and input sanitization belong with the **caller**, not the adapter. When the caller decides `--preserve-case`, the adapter respects it without second-guessing. See `tools/add-word.ts` and `adapters/wordnik.ts` for the pattern.

## The Boundary

This is the one architectural rule that cannot be broken. Breaking it silently destroys CLI tools.

**`utils/`** (root) contains pure Node.js business logic. CLI tools, tests, and Astro components all use it.
**`src/utils/`** contains Astro-specific wrappers that use Content Collections, framework APIs, and Sentry.

**The rule**: Files in `utils/` must never import from `#astro-utils/*` or `astro:*`.

Why? CLI tools run as plain Node.js. They import from `utils/`. If `utils/` pulls in `astro:content`, Node.js throws "Cannot find module" because the `astro:` protocol only exists inside Astro's build system. The failure cascades silently through the import chain.

**The pattern**:
```typescript
// utils/word-data-utils.ts — Pure function, works everywhere
export const getWordsByLength = (length: number, words: WordData[]): WordData[] =>
  words.filter(word => word.word.length === length);

// src/utils/word-data-utils.ts — Thin Astro wrapper, adds cached collection
import { getWordsByLength as pure } from '#utils/word-data-utils';
export const allWords = await getAllWords();
export const getWordsByLength = (length: number, words = allWords) => pure(length, words);
```

Architecture tests in `tests/architecture/` catch boundary violations automatically.

## Code Ethos

### JavaScript: modern, functional, immutable

**`const` by default.** Prefer `const` — reaching for `let` should feel like a deliberate decision, not a default. Valid uses: accumulation in `for` loops, stream callbacks, or cases where reassignment genuinely simplifies the logic. If `let` is the clearest solution, use it. If a container (`const cache = { value: null }`) or a declarative transform would be equally clear, prefer those. Never `var`.

**Declarative transforms.** `.map()`, `.filter()`, `.find()`, `.flatMap()`, `.reduce()` for data transformation. Reserve `for` loops for cases that genuinely need them: stateful accumulation, early exit with `return`, or `try/catch` per iteration. If a loop body is just `.push()`, it should be `.map()`.

**Modern platform APIs.** `Object.groupBy()`, `Array.findLast()`, `util.parseArgs()`, optional chaining, nullish coalescing, destructuring. Use what the runtime provides before reaching for libraries.

**Fast-fail, flat code.** Validate at the top, return early, keep the happy path unindented. Deep nesting signals a function trying to do too much.

### TypeScript: strict, pragmatic, no lies

Strict null checks and `noUncheckedIndexedAccess` are on. They catch real bugs. Work with the type system, not around it.

**Type guards over assertions.** Never `as SomeType` to silence the compiler. If you need to narrow, write or use a type guard. `isLogContext` from `#types` is the canonical example — it prevents `Object.entries()` from iterating string characters or Error properties.

```typescript
// Type guard narrows safely
if (isLogContext(rawContext)) {
  for (const [key, value] of Object.entries(rawContext)) { ... }
}

// Assertion lies to the compiler — rawContext might be an Error or string
const ctx = rawContext as LogContext;
```

**Discriminated unions for variant types.** Use a literal `type` field to distinguish shapes. This enables exhaustive `switch` and makes impossible states unrepresentable.

**`unknown` over `any`.** External data or uncertain types start as `unknown` and get narrowed through validation. `any` disables the type system — avoid it.

**Interfaces for structure, type aliases for unions.** `interface` for object shapes (they're extendable and produce clearer error messages). `type` for unions, intersections, and aliases.

### Errors: structured, honest, complete

**Structured logging.** `logger.error('message', { key: value })` — message first, context object second. No log prefixes (log levels handle that). No string concatenation for context.

**`await exit(code)` in CLI tools.** Never bare `process.exit()` in error handlers. The `exit()` helper from `#utils/logger` flushes pending Sentry events first. `process.exit()` kills in-flight async work immediately.

**Throw at boundaries, catch at the top.** Pure functions throw when they can't do their job. CLI entry points catch and log with context. Don't scatter try/catch through business logic.

### Tests: self-contained, layered, precise

Each test owns its setup and leaves no trace. Vitest provides purpose-built APIs — use them:

- `vi.stubEnv()` — environment variables (auto-restores)
- `vi.stubGlobal()` — build-time globals (auto-restores)
- `vi.resetModules()` + dynamic `import()` — module re-evaluation
- `vi.useFakeTimers()` / `vi.useRealTimers()` — time control
- `vi.hoisted()` — values needed before `vi.mock()` runs

**`const` in tests too.** Container objects (`const ctx = { spy: null }`) with property mutation in `beforeEach`. The binding stays immutable.

**Five layers, each catches different problems:**
1. **Unit** (`tests/utils/`, `tests/adapters/`) — pure function correctness
2. **Component** (`tests/src/`) — Astro wrappers, SEO, schemas
3. **Architecture** (`tests/architecture/`) — import boundary enforcement
4. **CLI Integration** (`tests/tools/`) — real process spawning, catches `astro:` protocol errors
5. **E2E** (`tests/e2e/`) — Playwright tests against the built site (navigation, SEO, accessibility)

**No overlapping tests.** Each function is tested at exactly one layer. Unit tests validate logic. E2E tests validate the built output (rendered HTML, route resolution, meta tags). Don't duplicate unit-level assertions in E2E tests or vice versa.

**E2E tests verify build assembly, not logic.** The E2E layer catches problems that only exist in the assembled HTML served in a real browser: link clicks resolve to real pages, meta tags survive the build pipeline, JSON-LD script tags parse as valid JSON, keyboard focus management works, feeds and sitemaps return HTTP 200. If a check can run without a browser — URL generation, schema content, meta tag values — it belongs at the unit or component layer. E2E asserts on element presence and navigability, not content correctness.

**E2E tests run in demo mode.** The E2E CI workflow skips `setup-env` and builds with Astro defaults (`SOURCE_DIR=demo`, no `BASE_PATH`). Production builds use `BASE_PATH` for GitHub Pages subdirectory hosting, but E2E validates site functionality at root. All test URLs must omit trailing slashes (`trailingSlash: 'never'`). Test elements and user journeys, not strings — discover content through navigation instead of hardcoding word URLs.

**Validate E2E assertions against built HTML.** Before pushing E2E changes, build the site (`npm run build`) and verify selectors match the actual `dist/` output. Check element classes, href patterns, and page structure. A passing typecheck does not catch selector mismatches — only the built HTML reveals the truth.

Test data lives close to use: global fixtures in `tests/setup.js`, per-file data at describe-block scope, shared helpers (used in 3+ files) in `tests/helpers/` via `#tests/*`.

## Import Aliases

Node.js subpath imports (`#` prefix) in `package.json` — the single source of truth for TypeScript, Vite, and Vitest. Always use aliases, never relative paths.

| Alias | Path | Context |
|-------|------|---------|
| `#utils/*` | `utils/*` | Pure Node.js, safe everywhere |
| `#astro-utils/*` | `src/utils/*` | Astro only, never from `utils/` or `tools/` |
| `#components/*` | `src/components/*` | |
| `#layouts/*` | `src/layouts/*` | |
| `#types`, `#types/*` | `types/` | |
| `#constants/*` | `constants/*` | |
| `#config/*` | `config/*` | |
| `#adapters/*` | `adapters/*` | |
| `#tools/*` | `tools/*` | |
| `#tests/*` | `tests/*` | |

## Data Flow

1. Words stored as JSON in `data/{SOURCE_DIR}/words/{year}/{YYYYMMDD}.json`
2. Loaded via Astro Content Collections (`src/content.config.ts`) at build time
3. `src/utils/word-data-utils.ts` provides cached `allWords` with computed derivatives
4. Statistics pre-computed once, not recalculated per page

## Environment

All config via environment variables validated in `astro.config.ts` (single source of truth). Four required: `SITE_URL`, `SITE_TITLE`, `SITE_DESCRIPTION`, `SITE_ID`. Everything else has defaults. Build-time globals (`__SITE_TITLE__`, `__BASE_URL__`, etc.) injected via Vite `define`. See `.env.example` for the full list.

## URL System

- `getUrl(path)` — relative URL with `BASE_PATH` for internal navigation
- `getFullUrl(path)` — absolute URL for SEO/social sharing
- Never hardcode paths; always use these helpers

## Quality Gates

Run in order before committing (each catches different issues):

```sh
npm run lint                       # 1. Syntax/style (oxlint)
npm run typecheck                  # 2. Type correctness (tsc + astro check)
npm test                           # 3. Unit/component tests with coverage
npm run build                      # 4. Full build (catches runtime errors)
npm run test:e2e                   # 5. E2E tests against built site
```

All must pass: 0 lint errors, 0 TypeScript errors, 0 Astro warnings, all tests green with coverage met (80% across lines/functions/statements, 85% branches), build succeeds without `.env`, E2E tests pass.

## Conventions

These aren't enforced by tools, but the codebase follows them consistently:

- Comments above the line they describe, never inline
- No emojis anywhere in the codebase
- No log message prefixes (log levels are sufficient)
- Don't commit planning docs, investigation notes, or temporary files

## Contributing via Git

### Commits

Run all quality gates before committing. Stage specific files by name — avoid `git add -A` or `git add .` which can catch secrets or build artifacts. Write concise commit messages that explain the why, not the what.

### Pull Requests

- Keep PRs focused on a single concern
- Include a summary of what changed and why
- Reference related issues when applicable
- Ensure all quality gates pass on the branch

## Documentation

| Document | Purpose |
|----------|---------|
| `AGENTS.md` | Philosophy, principles, working guidance (this file) |
| `CLAUDE.md` | Symlink to `AGENTS.md` (Claude Code reads this) |
| `.github/copilot-instructions.md` | Distilled guidelines for GitHub Copilot |
| `.github/instructions/` | Scoped Copilot instructions (code review focus/exclusions) |
| `.github/pull_request_template.md` | PR body template (used by GitHub UI and PR skill) |
| `.agents/skills/` | Agent skills (validate, commit, pr) — tool-agnostic canonical location |
| `.claude/skills` | Symlink to `.agents/skills/` (Claude Code reads this) |
| `docs/technical.md` | Architecture reference, file structure, environment details |
| `docs/agents/cli-patterns.md` | CLI tool patterns for token-efficient agent workflows |
| `docs/agents/backlog.md` | Known gaps and technical debt |
| `docs/agents/features.md` | Feature ideas, prioritized |
| `README.md` / `docs/README.md` | User-facing overview and quick start |

Update relevant docs when making architectural changes.
