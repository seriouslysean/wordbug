# Copilot Instructions

Coding guidelines for GitHub Copilot. For the full philosophy and architecture, see [AGENTS.md](../AGENTS.md) and [docs/technical.md](../docs/technical.md). Agent skills live in [.agents/skills/](../.agents/skills/).

## Project

Astro static site generator for word-of-the-day websites. Zero application JavaScript by default (no UI framework or hydration); only Astro's prefetch runtime and minor progressive enhancements. Native CSS `@view-transition` for page transitions — no JS, no `<ClientRouter />`. TypeScript throughout. Node.js 26+.

## Code Style

- `const` by default. `let` is valid when reassignment genuinely simplifies the logic (loops, streams, accumulation) — but it should feel like a deliberate choice. Never `var`.
- Declarative transforms: `.map()`, `.filter()`, `.find()`, `.flatMap()`, `.reduce()`. Use `for` loops only for stateful accumulation, early exit, or per-iteration try/catch.
- Modern APIs: `Object.groupBy()`, `Array.findLast()`, `util.parseArgs()`, optional chaining (`?.`), nullish coalescing (`??`), destructuring.
- Fast-fail: validate at the top, return early, keep happy path flat.
- Comments above the line they describe, never inline.
- No emojis anywhere in the codebase.
- Structured logging: `logger.error('message', { key: value })`. No log prefixes.
- CSS: one width breakpoint (`min-width: 768px`), fluid (`clamp()`, `auto-fill`/`minmax()`) otherwise. Shared link styles are scoped components, not global classes; client-created DOM needs `:global()` under a scoped parent.

## TypeScript

- `strictNullChecks` and `noUncheckedIndexedAccess` are enabled.
- Type guards over `as` assertions. Never `as SomeType` to silence errors.
- `unknown` over `any`. Narrow through validation.
- Discriminated unions with a `type` field for variant types.
- `interface` for object shapes, `type` for unions and aliases.

## Architecture: The Boundary

The one rule that cannot be broken: code outside `src/` (`utils/`, `adapters/`, `tools/`, `constants/`, `config/`, `types/`) never imports from `#astro-utils/*`, `astro:*`, or `@sentry/astro`. CLI tools run as plain Node.js and crash on any Astro-only module in their import chain.

- `utils/` = pure Node.js business logic (used by CLI tools, tests, Astro)
- `src/utils/` = Astro-specific wrappers (Content Collections, Sentry, caching)
- Architecture tests in `tests/architecture/` enforce the boundary

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

## Adapters

- Adapters own vocabulary, not behaviour. Each translates its partner's terms into the canonical contract (`DictionaryResponse`, `DictionaryDefinition`): a vocabulary part of speech or the raw term as `label`, text as one plain string with cross-references as `references` ranges, `id` as the headword of the definition's entry (never the partner's own identifier), empty optional fields omitted. An adapter only fetches: pages render stored records without it. Retries, query case, fallback and input handling belong with the caller; an adapter looks up exactly the word it is given.
- The contract is enforced, not trusted: `fetchWithFallback()` checks every answer with `isCanonicalResponse()` (`utils/adapter-utils.ts`) and refuses a broken one whole, so the chain moves on and the fault is reported. Of the responses adapters return, only one whose definition list the partner sent empty is not found; every other is held to the guard. An answer listing only blank definitions, or lacking a documented field on every entry, is an unexpected shape.
- `tests/adapters/contract.spec.ts` holds every registered adapter to the same guard: a fixture directory `tests/adapters/fixtures/<adapter name>/` with at least one successful response, each coming out canonical with a displayable definition.
- Two adapters, `merriam-webster` and `wiktionary`; a dictionary whose terms forbid storing its data is not one to add.
- Shared translation lives in `utils/adapter-utils.ts` (`buildDefinition()`, `buildDictionaryResponse()`); the registry in `adapters/index.ts` dispatches by name.

## Import Aliases

Always use `#` aliases from `package.json` imports field. Never use relative paths.

TypeScript aliases (`#utils`, `#astro-utils`, `#types`, `#constants`, `#config`, `#adapters`, `#tools`) are written without an extension; the `imports` target adds `.ts`. All other aliases include the extension (`.astro`, `.json`, `.css`, `.js`). JSON imports take `with { type: 'json' }`. No `paths` in `tsconfig.json`.

- `#utils/*` -> `utils/*` (pure Node.js, safe everywhere)
- `#astro-utils/*` -> `src/utils/*` (Astro only)
- `#components/*` -> `src/components/*`
- `#layouts/*` -> `src/layouts/*`
- `#pages/*` -> `src/pages/*`
- `#types` / `#types/*` -> `types/`
- `#constants/*` -> `constants/*`
- `#config/*` -> `config/*`
- `#adapters/*` -> `adapters/*`
- `#tools/*` -> `tools/*`
- `#data/*` -> `data/*`
- `#styles/*` -> `src/styles/*`
- `#assets/*` -> `src/assets/*`
- `#locales/*` -> `locales/*`
- `#tests/*` -> `tests/*`

## One Source of Truth

- Environment validation and CSP live in `astro.config.ts`. Dynamic inline content that cannot be auto-hashed goes in a same-origin endpoint (`src/pages/theme.css.ts`, `src/pages/ga-init.js.ts`), not inline `<style set:html>`, `<script is:inline>`, or `define:vars`.
- Stats definitions live in `constants/stats.ts`, URL patterns in `constants/urls.ts`.
- URLs: `getUrl(path)` for internal navigation (adds `BASE_PATH`), `getFullUrl(path)` for absolute SEO and social URLs. Never hardcode paths. Pass a route without a trailing slash (`/stats`); the helpers end a page URL in one (`/stats/`) and leave a file URL (`/rss.xml`) without. `Astro.url.pathname` ends in a slash and already carries `BASE_PATH`: read it through `getPathname()` or `stripBasePath()`, and never pass it to `getUrl()` or `getFullUrl()`, which take a route and always add the base.

## Error Handling

- `await exit(code)` in CLI tools, never bare `process.exit()` in async error handlers. The `exit()` helper from `#utils/logger` flushes Sentry first. `process.exit(0)` for `--help` and module-level validation guards is fine: nothing is in flight yet.
- Every async main call in a CLI tool is awaited inside try/catch or has a `.catch()` that calls `await exit(1)`.
- Throw at boundaries, catch at the top. Don't scatter try/catch.

## Testing

Five test layers: unit (`tests/utils/`, `tests/adapters/`), component (`tests/src/`), architecture (`tests/architecture/`), CLI integration (`tests/tools/`), E2E (`tests/e2e/`). Vitest for the first four, Playwright for E2E.

- Environment variables: mutate `mockEnv.FIELD` (from `tests/setup.ts`) for `astro:env/client` mocks. Use `vi.stubGlobal()` only for the four remaining Vite defines (`__VERSION__`, `__RELEASE__`, `__TIMESTAMP__`, `__WORD_DATA_PATH__`).
- `const` containers in tests: `const ctx = { spy: null }` with mutation in `beforeEach`.
- Coverage thresholds: 80% across lines/functions/statements, 85% branches.
- Before writing or changing a test, read https://github.com/splitleafhq/.github/blob/main/docs/testing.md.
- A regression gets one test, at the layer where the bug lives.
- E2E verifies build assembly (navigation, meta tag presence, JSON-LD parsability, keyboard a11y), not logic. If it can run without a browser, it belongs at a lower layer.
- E2E runs in demo mode (no `BASE_PATH`). Requires `npm run build` first. Page URLs in tests end in a trailing slash (`/stats/`); file URLs (`/rss.xml`) do not. Test elements and user journeys, not strings.
- Real data over feature flags: when a test or page needs data, add demo words that produce it, dated before 20250117.

## Environment

Four required env vars: `SITE_URL`, `SITE_TITLE`, `SITE_DESCRIPTION`, `SITE_ID`. Everything else has defaults. All validated in `astro.config.ts` via `astro:env` schema. Accessed in `src/` code via `import { VAR } from 'astro:env/client'`.

## Quality Gates

All must pass before committing:

```sh
npm run lint        # 0 errors/warnings
npm run typecheck   # 0 TS errors, 0 Astro warnings
npm test            # All tests green, coverage met
npm run build       # Build succeeds without .env
npm run test:e2e    # E2E tests pass against built site
```

The upstream repository keeps its words under `data/demo/`, so a local build there is `SOURCE_DIR=demo npm run build`.

## Downstream Sites

This repository is the engine. A downstream site (wordbug, wordbun) is a full copy of it in a repository of its own, not a GitHub fork: it adds its own words, runs the tools and workflows itself, and takes each release by merging this repository's `main` with `npm run tool:sync`. Two rules keep those merges clean:

- The engine never tracks anything under `data/words/` or `public/images/`: they are the sites'. Demo words and cards live under `data/demo/` and `public/demo/`. `tests/architecture/site-content.spec.ts` enforces it.
- Engine files, which is everything else, are changed only in this repository, never in a site. The favicons are the only files both sides hold.

## Pull Requests

- Keep PRs focused on a single concern
- Stage specific files, not `git add -A`
- Commit messages explain the why, not the what
- All quality gates must pass
