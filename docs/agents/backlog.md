# Technical Improvements Backlog

Known gaps and technical debt, organized by area.

## Implementation Gaps

### Client-Side Search

- `src/pages/words.json.ts` endpoint exists but nothing consumes it
- No search component, no fuzzy matching
- Opportunity: lightweight client-side search using the existing JSON endpoint

### Cross-Page Navigation

- Word pages lack contextual discovery links ("Other X-letter words", "Words from this month")
- No systematic internal linking between related content
- Impact: SEO internal link density, user engagement

### Error Handling Consistency

- CLI tools use consistent exit patterns (`await exit()` in async handlers, `.catch()` on main calls)
- Adapter HTTP errors, JSON parsing, and word-not-found all use shared helpers from `utils/adapter-utils.ts`
- Remaining: no standardized error types, mixed strategies in non-CLI code (throw, return null, log and continue)

### HTML/SEO

- No known issues

## Documentation Gaps

### Environment Variables

Several env vars lack documentation in `docs/technical.md`:
- `SITE_LOCALE`, `SITE_AUTHOR`, `SITE_AUTHOR_URL`, `SITE_ATTRIBUTION_MESSAGE`
- `HUMANS_*` variables (word curator, developer name/contact/site)
- `SITE_KEYWORDS`

### Content Collections

- Dynamic path injection via `__WORD_DATA_PATH__` deserves more detail
- Error handling for missing or malformed word data not documented

## Test Coverage

~499 tests across 5 layers: unit, component, architecture, CLI integration, E2E. Coverage at ~84%.

### Remaining Gaps

- `src/utils/static-file-utils.ts` (build-time only, validated by build)
- `src/utils/static-paths-utils.ts` (build-time only, validated by build)

These are excluded from coverage thresholds because they're validated by the build process itself.

## Migration Opportunities

- Astro responsive image component not yet utilized
- Astro type-safe environment variables API not yet adopted

## Performance

- No build-time performance tracking or bundle size analysis in CI
- Current performance is good; these would be incremental improvements
