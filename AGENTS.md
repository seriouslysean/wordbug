# AGENTS.md - Project Instructions

> **For AI Agents**: This file contains MANDATORY instructions that must be followed on every interaction. Read and follow ALL guidelines below.

## MANDATORY First Steps

1. **ALWAYS read documentation first**: Start with `docs/README.md` then `docs/technical.md` - this is REQUIRED before any code changes
2. **USE the TodoWrite tool**: Create and maintain a todo list for ANY multi-step task - this is REQUIRED for project tracking
3. **Follow existing patterns**: Check similar files for code style and architecture patterns BEFORE writing new code
4. **Environment-driven**: All configuration uses environment variables - NEVER hardcode values

## Key Commands

```bash
npm run dev              # Development server
npm run build           # Build for production
npm run test            # Run tests
npm run tool:add-word   # Add new word interactively
```

## CRITICAL Requirements

- **ALWAYS run `npm run lint` and `npm run typecheck`** after ANY code changes - this is MANDATORY
- **NO hardcoded values**: Everything uses environment variables
- **PRESERVE functionality**: Never break existing word display, navigation, or data loading
- **TEST builds**: Always run `npm run build` to verify before suggesting changes
- **ASK before major changes**: Get user approval for architectural changes or refactoring

## MANDATORY Workflow

1. **Read docs/README.md and docs/technical.md FIRST**
2. **Create TodoWrite list for multi-step tasks**
3. **Follow existing code patterns** - check similar files before writing new code
4. **Run lint/typecheck after changes**
5. **Verify build succeeds**

## Code Style Guidelines

- **Use `const` only**: No `let` or `var` - prefer immutable declarations
- **Fast-fail validation**: Early returns and exits, avoid nested conditions
- **Modern ES6+ syntax**: Use destructuring, arrow functions, template literals
- **camelCase for object keys**: JavaScript convention, not snake_case
- **Clean error handling**: One `console.error()` call per error with message + data object
- **Proper sentence structure**: All descriptions and text content should end with periods for proper sentence structure
- **Proper casing**: Use proper title case for headings and descriptions - avoid `.toLowerCase()` except for data storage. Let CSS handle display formatting

---

For complete project context, architecture details, and implementation notes, see the documentation in the `docs/` directory:

- `docs/README.md` - Project overview and technology stack
- `docs/technical.md` - Detailed architecture, build process, and constraints
- `docs/potential-features.md` - Future enhancement ideas organized by complexity and impact