# AGENTS.md - AI Agent Instructions

> **CRITICAL**: This file contains MANDATORY instructions for AI agents. Follow ALL guidelines below on every interaction.

## MANDATORY First Steps

### 1. READ THE DOCUMENTATION FIRST
**ALWAYS** read the documentation before making ANY changes or suggestions:

1. **[README.md](README.md)** - Project overview, quick start, basic configuration
2. **[docs/technical.md](docs/technical.md)** - Complete technical architecture, tools, environment variables, patterns
3. **[docs/potential-features.md](docs/potential-features.md)** - Planned features and priorities

**DO NOT:**
- Guess at configurations or environment variables
- Duplicate information that's already documented
- Make assumptions about architecture or patterns
- Suggest changes without understanding current implementation

**DO:**
- Reference specific sections from documentation when answering questions
- Point users to relevant documentation sections
- Ask for clarification if documentation doesn't cover the user's question
- Update documentation when making architectural changes

### 2. Track Multi-Step Tasks
Create and maintain todo lists for ANY task with multiple steps - this is REQUIRED for tracking progress.

### 3. Follow Existing Patterns
Check similar files in the codebase for architectural patterns BEFORE writing new code.

## MANDATORY Workflow

```bash
# ALWAYS run after ANY code changes
npm run lint         # Fix code style issues
npm run typecheck    # Validate TypeScript
npm test            # Run test suite
npm run build        # Verify build succeeds
npx astro check      # Check for TypeScript errors, warnings, and hints
```

### Quality Gates - ALL Must Pass
- **0 ESLint errors or warnings** - Fix all linting issues
- **0 TypeScript errors** - Resolve all type errors
- **0 Astro warnings or hints** - Address all unused imports, type issues, etc.
- **All tests passing** - No failing tests allowed
- **Build succeeds** - Must compile without errors
- **DO NOT** commit code with warnings, hints, or errors
- **DO NOT** ignore build warnings from external dependencies (document if unfixable)

### Known External Warnings (Not Fixable in Our Code)
- **Vite Warning (Astro v5.15.6)**: `"matchHostname", "matchPathname", "matchPort" and "matchProtocol" are imported from external module "@astrojs/internal-helpers/remote" but never used`
  - **Source**: Internal Astro dependency issue in `node_modules/astro/dist/assets/`
  - **Status**: Cannot fix - this is in Astro's bundled code
  - **Impact**: None - does not affect build or runtime
  - **Action**: Monitor Astro updates for resolution

### Build Output Verification
After building, check the `dist/` directory structure:
- **Expected pages**: index.html, words/, stats/, 404.html
- **Static assets**: fonts/, favicon.ico, manifest.json
- **Social images**: Properly organized by SOURCE_DIR structure
- **Meta files**: sitemap-index.xml, robots.txt, humans.txt
- **Suspicious files**: Report any unexpected executables or scripts

## Key Commands

```bash
npm run dev                                      # Development server
npm run tool:local tools/add-word.ts --help     # Add word tool help
npm run tool:local tools/generate-images.ts --help  # Image generation tool help
npm test                                         # Run test suite
```

## CRITICAL Requirements

- **Documentation First**: Read docs before making changes
- **No Hardcoding**: Everything uses environment variables (see docs/technical.md)
- **Test All Changes**: Run lint/typecheck/build after ANY modifications
- **Preserve Functionality**: Never break existing word display, navigation, or data loading
- **Ask Before Major Changes**: Get user approval for architectural modifications

## Code Quality Standards

### Comments
- **No Useless Comments**: Remove comments that don't add meaningful information
- **Above-Line Comments**: Always place comments above the line they describe, never inline
- **No Emojis**: Absolutely no emojis anywhere in the app
- **No Prefixes**: Don't prefix log messages (log levels are sufficient)

### Environment Variables
- **Single Source of Truth**: `astro.config.mjs` handles all validation, don't duplicate
- **Only Required**: Only 4 variables are truly required: SITE_URL, SITE_TITLE, SITE_DESCRIPTION, SITE_ID
- **Optional Features**: Everything else has defaults or is feature-flag driven

### Import Aliases
- **Always Use Aliases**: Use `~components`, `~astro-utils`, etc. instead of relative imports
- **Never Relative**: `../` imports are not allowed, use aliases exclusively
- **CRITICAL**: Files in `utils/` MUST NOT import from `~astro-utils/*` (breaks CLI tools)
  - See docs/technical.md "Utility Architecture and Import Guidelines" for full details

## Documentation Structure

- **README.md**: User-facing overview and quick start
- **docs/technical.md**: Complete technical documentation
- **docs/improvements-backlog.md**: Prioritized technical improvements and issues
- **docs/current-focus.md**: Active development task tracking

When users ask questions:
1. Check if it's covered in documentation
2. Reference specific documentation sections in your answer
3. Only provide additional details not covered in docs

## Task Tracking

### Current Focus Document
- Location: docs/current-focus.md
- Purpose: Track active development task and progress
- Persistence: Keep in repository, clear content after task completion
- Usage: Update before starting work, clear when done

### Workflow
1. Select task from docs/improvements-backlog.md
2. Update docs/current-focus.md with task details
3. Complete implementation
4. Clear current-focus.md for next agent
5. Update improvements-backlog.md status

## Project Context

This is a static site generator for word-of-the-day websites that powers multiple child sites. The architecture is designed for:
- Environment-driven configuration (no hardcoded values)
- Static site generation with Astro
- Content Collections for word data management
- CLI tools for content management
- Multi-site deployment support

**For ALL technical details, architecture information, environment variables, and implementation patterns: READ THE DOCUMENTATION FIRST.**