# Occasional Word of the Day

Static site generator for word-of-the-day websites.

## Quick Reference

See [AGENTS.md](AGENTS.md) for full AI agent instructions.

## Development Workflow

```sh
# 1. Make changes

# 2. Typecheck (fast)
npm run typecheck

# 3. Run tests
npm test                           # Full suite
npm test -- -t "test name"         # Single test

# 4. Lint before committing
npm run lint:fix                   # Auto-fix issues
npm run lint                       # Check only

# 5. Build verification
npm run build
npx astro check

# 6. Before creating PR
npm run lint && npm run typecheck && npm test && npm run build
```

## Key Commands

- `npm run dev` - Development server
- `npm run lint` - Check code style
- `npm run lint:fix` - Fix code style
- `npm run typecheck` - Validate TypeScript
- `npm test` - Run tests
- `npm run build` - Build for production
- `npx astro check` - Check for Astro issues
- `npm run tool:local tools/add-word.ts` - Add new word

## Architecture

- Astro static site generator
- Content Collections for word data
- Environment-driven configuration
- Multi-site deployment support

## Important Files

- `astro.config.mjs` - Main configuration
- `src/content/` - Word content
- `tools/` - CLI utilities
- `docs/technical.md` - Full technical docs
