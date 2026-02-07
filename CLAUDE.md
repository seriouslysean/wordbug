# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static site generator (Astro) for word-of-the-day websites. Powers multiple child sites via environment-driven configuration. All pages are pre-rendered at build time with zero client-side JavaScript by default.

## Commands

```sh
npm run dev                        # Development server
npm run build                      # Production build
npm run typecheck                  # TypeScript + Astro check (uses `astro check`)
npm test                           # Full test suite with coverage
npm test -- -t "test name"         # Single test by name
npm run test:watch                 # Watch mode
npm run lint                       # oxlint check
npm run lint:fix                   # oxlint auto-fix

# Before committing or creating a PR:
npm run lint && npm run typecheck && npm test && npm run build

# CLI tools (local dev with .env):
npm run tool:local tools/add-word.ts serendipity
npm run tool:local tools/generate-images.ts --all
npm run tool:local tools/generate-images.ts --generic
```

Pre-commit hooks (husky + lint-staged) auto-run `oxlint --fix` and related tests on staged `.js/.ts/.astro` files.

## Architecture

### Two-Layer Utility System (Critical)

The project enforces a strict separation between pure Node.js utilities and Astro-specific code:

- **`utils/`** (root) — Pure business logic. Used by CLI tools, tests, and Astro components. No Astro/framework dependencies allowed.
- **`src/utils/`** — Astro-specific wrappers. Uses Content Collections, caching, Sentry. Only for use in `src/` (pages, components, layouts).

**Import alias mapping:**
- `#utils/*` → `utils/` (pure, Node.js-safe)
- `#astro-utils/*` → `src/utils/` (Astro-only)

**The boundary rule:** Files in `utils/` must NEVER import from `#astro-utils/*` or `astro:*`. This breaks CLI tools. Architecture tests in `tests/architecture/` enforce this automatically.

**Correct pattern** for shared logic: put pure function in `utils/`, create thin Astro wrapper in `src/utils/` that delegates to the pure function (not duplicates it).

### Import Aliases

Uses Node.js subpath imports (`#` prefix) defined in `package.json` `imports` field. This is the single source of truth for all alias resolution (TypeScript, Vite, Vitest). Always use aliases, never relative paths (`../`):

| Alias | Path |
|-------|------|
| `#components/*` | `src/components/*` |
| `#layouts/*` | `src/layouts/*` |
| `#astro-utils/*` | `src/utils/*` |
| `#utils/*` | `utils/*` |
| `#types` | `types/index.ts` |
| `#types/*` | `types/*` |
| `#constants/*` | `constants/*` |
| `#config/*` | `config/*` |
| `#adapters/*` | `adapters/*` |
| `#data/*` | `data/*` |
| `#styles/*` | `src/styles/*` |
| `#assets/*` | `src/assets/*` |
| `#tools/*` | `tools/*` |

### Data Flow

1. Words stored as JSON: `data/{SOURCE_DIR}/words/{year}/{YYYYMMDD}.json`
2. Loaded via Astro Content Collections (`src/content.config.ts`) at build time
3. `src/utils/word-data-utils.ts` provides cached `allWords` collection with computed derivatives
4. Statistics pre-computed once from `allWords`, not recalculated per page

### Environment Configuration

All config via environment variables (validated in `astro.config.ts` which is the single source of truth — don't duplicate validation). Four required: `SITE_URL`, `SITE_TITLE`, `SITE_DESCRIPTION`, `SITE_ID`. Everything else has defaults. Copy `.env.example` to `.env` for local dev. In CI, env vars are passed directly.

Build-time globals (e.g., `__SITE_TITLE__`, `__BASE_URL__`, `__VERSION__`) are injected via Vite `define` in `astro.config.ts`.

### URL System

- `getUrl(path)` — relative URL with `BASE_PATH` for internal navigation
- `getFullUrl(path)` — absolute URL for SEO/social sharing
- Never hardcode paths; always use these helpers

### Test Structure

Tests are in `tests/` using Vitest (config: `vitest.config.ts`). Three layers:
- **Unit** (`tests/utils/`, `tests/adapters/`) — pure function correctness
- **Architecture** (`tests/architecture/`) — import boundary enforcement, DRY violations
- **CLI Integration** (`tests/tools/`) — spawns real processes, catches `astro:` protocol errors

Coverage thresholds: lines 80%, functions 75%, branches 85%, statements 80%.

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/pages/` | Astro route definitions |
| `src/components/` | Reusable Astro components |
| `src/layouts/` | Page layout templates |
| `tools/` | CLI tools (Node.js only, no Astro deps) |
| `adapters/` | Dictionary API adapters (e.g., Wordnik) |
| `types/` | Shared TypeScript type definitions |
| `constants/` | Application constants (stats slugs, URLs) |
| `config/` | Path configuration |

## Code Style

- `const` only — no `let` or `var`
- Comments above the line they describe, never inline
- No emojis anywhere in the codebase
- No log message prefixes (log levels are sufficient)
- Structured logging: message + data object format
- Fast-fail with early returns; avoid deep nesting

## Quality Gates

All must pass before committing:
- 0 oxlint errors/warnings (`npm run lint`)
- 0 TypeScript errors (`npm run typecheck`)
- 0 Astro warnings/hints
- All tests passing (`npm test`)
- Build succeeds (`npm run build`)

## Documentation

- `docs/technical.md` — Complete technical architecture reference
- `docs/improvements-backlog.md` — Prioritized technical improvements
- `docs/current-focus.md` — Active development task tracking (update before starting work, clear when done)

When making architectural changes, update the relevant documentation.
