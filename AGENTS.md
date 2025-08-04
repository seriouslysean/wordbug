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

### 2. USE TodoWrite for Multi-Step Tasks
Create and maintain todo lists for ANY task with multiple steps - this is REQUIRED for tracking progress.

### 3. Follow Existing Patterns
Check similar files in the codebase for architectural patterns BEFORE writing new code.

## MANDATORY Workflow

```bash
# ALWAYS run after ANY code changes
npm run lint         # Fix code style issues
npm run typecheck    # Validate TypeScript
npm run build        # Verify build succeeds
```

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

## Documentation Structure

- **README.md**: User-facing overview and quick start
- **docs/technical.md**: Complete technical documentation
- **docs/potential-features.md**: Future enhancements and priorities

When users ask questions:
1. Check if it's covered in documentation
2. Reference specific documentation sections in your answer
3. Only provide additional details not covered in docs

## Project Context

This is a static site generator for word-of-the-day websites that powers multiple child sites. The architecture is designed for:
- Environment-driven configuration (no hardcoded values)
- Static site generation with Astro
- Content Collections for word data management
- CLI tools for content management
- Multi-site deployment support

**For ALL technical details, architecture information, environment variables, and implementation patterns: READ THE DOCUMENTATION FIRST.**