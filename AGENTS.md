# AGENTS.md

Instructions for AI agents working in this repository. Start with [CLAUDE.md](CLAUDE.md) for philosophy, architecture, and code standards.

## Before You Start

1. Read [CLAUDE.md](CLAUDE.md) for how this project thinks about code
2. Read [docs/technical.md](docs/technical.md) for architecture details
3. Check similar files before writing new code — follow existing patterns

## Workflow

### Quality gates (run after every change)

```sh
npm run lint         # 0 errors, 0 warnings
npm run typecheck    # 0 TypeScript errors, 0 Astro warnings/hints
npm test             # All tests passing, coverage thresholds met
npm run build        # Build succeeds without .env
```

All four must pass before committing. No exceptions.

### What to commit

- Code changes, tests, documentation updates

### What not to commit

- Planning documents, investigation notes, temporary analysis files
- Files containing secrets (`.env`, credentials, API keys)

## Critical Architecture Note

**Files in `utils/` must never import from `#astro-utils/*` or `astro:*`.** This breaks CLI tools. See "The Boundary" in [CLAUDE.md](CLAUDE.md) for the full explanation. Architecture tests enforce this automatically.

## Known External Warnings

**Vite warning from Astro**: `"matchHostname", "matchPathname", "matchPort" and "matchProtocol" are imported from external module "@astrojs/internal-helpers/remote" but never used` — this comes from Astro's internal code, not ours. No impact on build or runtime. Monitor Astro updates for resolution.
