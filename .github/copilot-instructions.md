# Copilot Instructions

Coding guidelines for GitHub Copilot. For the full philosophy and architecture, see [AGENTS.md](../AGENTS.md) and [docs/technical.md](../docs/technical.md). Agent skills live in [.agents/skills/](../.agents/skills/).

## Project

Astro static site generator for word-of-the-day websites. Zero client-side JavaScript by default. TypeScript throughout. Node.js 24+.

## Code Style

- `const` by default. `let` is valid when reassignment genuinely simplifies the logic (loops, streams, accumulation) — but it should feel like a deliberate choice. Never `var`.
- Declarative transforms: `.map()`, `.filter()`, `.find()`, `.flatMap()`, `.reduce()`. Use `for` loops only for stateful accumulation, early exit, or per-iteration try/catch.
- Modern APIs: `Object.groupBy()`, `Array.findLast()`, `util.parseArgs()`, optional chaining (`?.`), nullish coalescing (`??`), destructuring.
- Fast-fail: validate at the top, return early, keep happy path flat.
- Comments above the line they describe, never inline.
- No emojis anywhere in the codebase.
- Structured logging: `logger.error('message', { key: value })`. No log prefixes.

## TypeScript

- `strictNullChecks` and `noUncheckedIndexedAccess` are enabled.
- Type guards over `as` assertions. Never `as SomeType` to silence errors.
- `unknown` over `any`. Narrow through validation.
- Discriminated unions with a `type` field for variant types.
- `interface` for object shapes, `type` for unions and aliases.

## Architecture: The Boundary

**Critical rule**: Files in `utils/` (root) must NEVER import from `src/utils/` or `astro:*`. This breaks CLI tools.

- `utils/` = pure Node.js business logic (used by CLI tools, tests, Astro)
- `src/utils/` = Astro-specific wrappers (Content Collections, Sentry, caching)

Pattern: put pure logic in `utils/`, create thin wrapper in `src/utils/` that delegates to it.

```typescript
// utils/word-data-utils.ts — Pure, works everywhere
export const getWordsByLength = (length: number, words: WordData[]): WordData[] =>
  words.filter(word => word.word.length === length);

// src/utils/word-data-utils.ts — Astro wrapper, cached collection
import { getWordsByLength as pure } from '#utils/word-data-utils';
export const allWords = await getAllWords();
export const getWordsByLength = (length: number, words = allWords) => pure(length, words);
```

## Import Aliases

Always use `#` aliases from `package.json` imports field. Never use relative paths.

- `#utils/*` -> `utils/*` (pure Node.js, safe everywhere)
- `#astro-utils/*` -> `src/utils/*` (Astro only)
- `#components/*` -> `src/components/*`
- `#layouts/*` -> `src/layouts/*`
- `#types` / `#types/*` -> `types/`
- `#constants/*` -> `constants/*`
- `#config/*` -> `config/*`
- `#adapters/*` -> `adapters/*`
- `#tools/*` -> `tools/*`

## Error Handling

- `await exit(code)` in CLI tools, never bare `process.exit()`. The `exit()` helper from `#utils/logger` flushes Sentry first.
- Throw at boundaries, catch at the top. Don't scatter try/catch.

## Testing

Vitest with four layers: unit (`tests/utils/`), component (`tests/src/`), architecture (`tests/architecture/`), CLI integration (`tests/tools/`). Playwright for E2E (`tests/e2e/`).

- Use `vi.stubEnv()` for env vars, `vi.stubGlobal()` for build-time globals.
- `const` containers in tests: `const ctx = { spy: null }` with mutation in `beforeEach`.
- Coverage thresholds: 80% across lines/functions/statements, 85% branches.
- No overlapping tests. Each function tested at exactly one layer.
- E2E runs in demo mode (no `BASE_PATH`). Requires `npm run build` first. Test URLs omit trailing slashes. Test elements and user journeys, not strings.

## Environment

Four required env vars: `SITE_URL`, `SITE_TITLE`, `SITE_DESCRIPTION`, `SITE_ID`. Everything else has defaults. All validated in `astro.config.ts`.

## Quality Gates

All must pass before committing:

```sh
npm run lint        # 0 errors/warnings
npm run typecheck   # 0 TS errors, 0 Astro warnings
npm test            # All tests green, coverage met
npm run build       # Build succeeds without .env
npm run test:e2e    # E2E tests pass against built site
```

## Pull Requests

- Keep PRs focused on a single concern
- Stage specific files, not `git add -A`
- Commit messages explain the why, not the what
- All quality gates must pass
