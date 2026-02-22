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

- Mixed patterns across codebase (throw, return null, log and continue)
- No standardized error types
- Structured logging is in place but error strategies vary

### HTML/SEO

- `src/layouts/Layout.astro` contains redundant hreflang tags
- `src/components/StructuredData.astro` hardcodes `numberOfItems: 0`
- `src/components/Header.astro` lacks semantic `<nav>` element

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

Coverage improved from 31.67% to ~84% (400 tests across 4 layers).

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
