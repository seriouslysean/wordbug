# Potential Features

Quality and architectural improvements, prioritized by impact.

## Tier 1: High Impact

### BEM Naming Cleanup

Pages using single class names (stats, word-facts) should follow a consistent naming pattern across all pages.

### Cross-Page Internal Linking

Strategic links between related content: "Other X-letter words", "Words from this month/year", "More words starting with [letter]". Significant SEO and content discovery gains.

### Accessibility Audit

- Keyboard navigation testing (especially button grids)
- Color contrast verification (WCAG AA/AAA)
- Screen reader testing
- ARIA labels and roles review

### SEO Audit & Schema Enhancement

- JSON-LD structured data improvements
- Schema.org WordDefinition markup
- Better Open Graph and Twitter Card meta
- Breadcrumb structured data
- Canonical URL review

### Performance Audit

- Lighthouse baseline scores
- Bundle size analysis
- Image and font loading optimization
- Critical CSS extraction

### Architecture & Code Quality

- Remove overly complex abstractions
- Reduce remaining DRY violations
- Review component boundaries and responsibilities
- Simplify where possible (KISS)

### CSS Architecture

- Eliminate duplicate styles
- Extract common patterns into shared utilities
- Consolidate media queries
- Review CSS variable consistency

### TypeScript Consolidation

- Audit 40+ interfaces across 8 type files for consolidation
- Remove unnecessary complexity
- Replace remaining `any` types
- Validate prop type completeness

### Astro Best Practices

- Confirm we're using built-in features (not reinventing)
- Review Astro image optimization usage
- Validate routing patterns follow Astro conventions

## Tier 2: Medium Impact

### i18n/Localization Audit

Review hardcoded strings, verify UI text uses translation keys, check date/number formatting consistency.

### Stats Definition Architecture

Scattered definitions across multiple files with complex interdependencies. A unified stats registry with self-describing objects would simplify adding new stats.

### Error Handling Consistency

Standardize error patterns (throw vs null vs log) with proper error types. See [backlog.md](backlog.md).

### Client-Side Search

Lightweight fuzzy search using the existing `/words.json` endpoint. Vanilla JS, no heavy dependencies, graceful degradation without JS.

## Tier 3: Lower Impact

### Test Coverage Completion

Fill remaining coverage gaps in `static-file-utils.ts` and `static-paths-utils.ts`.

### Stats Category Directory Pages

Landing pages for Word Facts, Letter Patterns, Word Endings sections. Better content discoverability and SEO.

### Enhanced Programmatic Stats

Chart-ready statistics: starting letter frequency distribution, word length histograms, curated common endings.

## Tier 4: Nice-to-Have

### Theme Switching (Dark/Light Mode)

System preference detection with manual toggle. CSS custom properties with JS toggle.

### Word Bookmarking

Personal favorites via LocalStorage. Client-side only, no server dependency.

## Notes

The codebase is well-maintained. Most improvements take it from "excellent" to "perfect." The utils/src-utils architectural separation is a genuine strength and should be preserved. Performance already meets requirements — optimizations would be incremental.
