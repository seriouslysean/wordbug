# AGENTS.md - Project Instructions

> **For AI Agents**: Read the documentation in `docs/` for project context and technical details.

## Quick Start

1. **Read the documentation**: Start with `docs/README.md` for project overview
2. **Technical details**: Check `docs/technical.md` for setup and architecture
3. **Follow patterns**: Use existing code patterns and conventions
4. **Environment-driven**: All configuration is in environment variables

## Key Commands

```bash
npm run dev              # Development server
npm run build           # Build for production
npm run test            # Run tests
npm run tool:add-word   # Add new word interactively
```

## Important Notes

- **No hardcoded values**: Everything uses environment variables
- **Test before committing**: Always run `npm run build` to verify
- **Follow existing patterns**: Check similar files for code style
- **Preserve functionality**: Don't break existing word display or navigation

## Code Style Guidelines

- **Use `const` only**: No `let` or `var` - prefer immutable declarations
- **Fast-fail validation**: Early returns and exits, avoid nested conditions
- **Modern ES6+ syntax**: Use destructuring, arrow functions, template literals
- **camelCase for object keys**: JavaScript convention, not snake_case
- **Clean error handling**: One `console.error()` call per error with message + data object

---

For complete project context, architecture details, and implementation notes, see the documentation in the `docs/` directory.