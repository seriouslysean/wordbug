# Technical Improvements Backlog

Known gaps and technical debt, organized by area.

## Implementation Gaps

### ✅ Cross-Page Navigation — SHIPPED

Word pages link to other words by length, part of speech, and year via
`WordRelated.astro`. See [features.md](features.md) for detail.

### Client-Side Search

- `src/pages/words.json.ts` endpoint exists but nothing consumes it
- No search component, no fuzzy matching
- Opportunity: lightweight client-side search using the existing JSON
  endpoint

### Error Handling Consistency

- CLI tools use consistent exit patterns (`await exit()` in async handlers,
  `.catch()` on main calls). CLI tools now gate `main()` execution behind
  `isEntryPoint(import.meta.url)` so they can be safely imported without
  side effects.
- Adapter HTTP errors, JSON parsing, and word-not-found all use shared
  helpers from `utils/adapter-utils.ts`.
- Remaining: no standardized error types, mixed strategies in non-CLI code
  (throw, return null, log and continue).

### HTML/SEO

- Done: `inLanguage` in JSON-LD; conditional `og:type=article` for word
  pages.
- Open: `CollectionPage.mainEntity.itemListElement[]` not populated. See
  Tier 1 SEO entry in [features.md](features.md).

## Documentation Gaps

### Environment Variables

Several env vars lack documentation in `docs/technical.md`:
- `SITE_LOCALE`, `SITE_AUTHOR`, `SITE_AUTHOR_URL`,
  `SITE_ATTRIBUTION_MESSAGE`
- `HUMANS_*` variables (word curator, developer name/contact/site)
- `SITE_KEYWORDS`

### Content Collections

- Dynamic path injection via `__WORD_DATA_PATH__` deserves more detail
- Error handling for missing or malformed word data not documented

## Test Coverage

~513 tests across 5 layers: unit, component, architecture, CLI integration,
E2E. Overall coverage ~82-84%.

### Remaining Gaps

- `src/utils/static-file-utils.ts` (build-time only, validated by build)
- `src/utils/static-paths-utils.ts` (build-time only, validated by build)
- `utils/word-stats-utils.ts` branch coverage at 50% — long streak/gap
  edge cases under-exercised.
- `utils/word-data-utils.ts` branch coverage at ~45% — extraction edge
  cases in `extractWordDefinition` and validation guards.

These are excluded from the coverage threshold where they're validated by
the build process itself; the others are real gaps.

## Migration Opportunities

- Astro responsive image component not yet utilized; one `<img>` in
  `Footer.astro`.
- Astro type-safe environment variables API: ~95% adopted. `SOURCE_DIR` in
  `src/utils/image-utils.ts:12` still reads from `import.meta.env`.
- See Tier 1 "Astro Best Practices" in [features.md](features.md).

## Deferred Dependency Majors

These are intentionally held back from the latest dep-bump pass; revisit
each when its blocker resolves.

- **TypeScript 5.9.3 → 6.0.x.** Holding at 5.9. TS 6 is a major language
  release; `@astrojs/check`'s language-server chain pulls in `yaml-language-
  server` which has its own TS peer-dep range. Wait until the Astro
  ecosystem signals compatibility.
- **entities 7 → 8.** Major bump. Used by `@astrojs/rss` indirectly. Verify
  RSS feed output before adopting.
- **opentype.js 1 → 2.** Used by `tools/generate-images.ts` for font path
  rendering. v2 API changes likely. Test image generation end-to-end before
  adopting; non-trivial validation.

## Local Development Notes

- E2E suite uses `localhost:4321`. If another Astro project (e.g. a sibling
  template based on this one) is running its own `dev`/`preview` on the
  same port, Playwright reuses that server and tests fail with mismatched
  content. Stop the other server, or override via `playwright.config.ts`
  `webServer.url` for parallel work.

## Performance

- Build-time perf finding from the audit pass resolved: per-word
  `getStaticPaths` no longer iterates `allWords` once per grouping
  computation. Groupings are pre-computed via `Object.groupBy` once and
  read per word.
- Speculation rules `eagerness` reduced from `eager` to `moderate` on hub
  URLs, reducing unsolicited prefetches.
- No build-time perf tracking or bundle-size analysis in CI; current
  performance is good. Lighthouse baselines would be the next step.

## Adapter Pipeline Health

Last verified by a full `tool:regenerate-all-words --force` pass across all
46 demo words: 45/46 succeeded; "Amblypygi" (a spider order) is not in
Merriam-Webster, Wordnik, or Wiktionary so the fallback chain exhausted
cleanly and preserved the original file. Adapter chain is healthy.
