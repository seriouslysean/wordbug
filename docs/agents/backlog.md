# Technical Improvements Backlog

Known gaps and technical debt, organized by area.

## Implementation Gaps

### Cross-Page Navigation — SHIPPED

Word pages link to other words by length, first letter, part of speech, and
year via `WordContext.astro`. See [features.md](features.md) for detail.

### Client-Side Search — SHIPPED

Zero-dependency starts-with search behind a header magnifying-glass icon, over
the existing `/words.json` (shared with the random-word button). Progressive
enhancement; the All Words page is the no-JS fallback.

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

### Environment Variables — SHIPPED

`SITE_LOCALE`, `SITE_AUTHOR`, `SITE_AUTHOR_URL`, `SITE_ATTRIBUTION_MESSAGE`,
the `HUMANS_*` variables and `SITE_KEYWORDS` are now in `docs/technical.md`.

### Content Collections

- Dynamic path injection via `__WORD_DATA_PATH__` deserves more detail
- Error handling for missing or malformed word data not documented

## Test Coverage

Five layers: unit, component, architecture, CLI integration, E2E. `npm test`
prints the current test count and coverage; neither is repeated here, where it
would go stale.

### Remaining Gaps

The gaps listed here before are closed: `static-file-utils.ts` and
`static-paths-utils.ts` have specs in `tests/src/utils/`, and
`utils/word-stats-utils.ts` and `utils/word-data-utils.ts` are above 95% of
branches. Notable in the coverage table as of v3.25.0:

- `src/utils/url-utils.ts` at 34% of functions: the single-expression URL
  helpers that the Architecture & Code Quality entry in
  [features.md](features.md) proposes deleting.
- `src/utils/static-paths-utils.ts` at 67% of branches and
  `src/utils/static-file-utils.ts` at 78% of lines.
- `tools/` at 68% of lines. Three entry points are excluded because they run
  in spawned processes (`vitest.config.ts` names them). Of those counted,
  `tools/create-site.ts` sits at 19% of lines and `tools/utils.ts` at 76%.

## Migration Opportunities

- Done: the Wordnik logo in `Footer.astro` renders through `<Image>` from
  `astro:assets`.
- Astro type-safe environment variables API: `SOURCE_DIR` and
  `WORDNIK_WEBSITE_URL` are in the schema and read through
  `astro:env/client`.
- See Tier 1 "Astro Best Practices" in [features.md](features.md).

## Local Development Notes

- E2E suite starts its own `astro preview --ignore-lock` on port 4517
  (`PORT` in `playwright.config.ts`) with `reuseExistingServer: false`, so it
  always serves this repo's current `dist/` and ignores anything on Astro's
  default 4321. `--ignore-lock` keeps the preview in the foreground when
  Astro detects a coding agent and does not claim the `.astro/preview.json`
  lock, so a separately running `astro dev`/`astro preview` keeps running
  (Astro still reads the lock and removes a stale one). If something else
  holds 4517 the run fails one of two ways: "http://localhost:4517 is
  already used" when the holder answers HTTP at `/`, or "Timed out waiting
  60000ms from config.webServer" when it does not (the preview then binds
  the next free port while Playwright keeps polling 4517). `lsof -i :4517`
  finds the holder in both cases.

## Performance

- Build-time perf finding from the audit pass resolved: per-word
  `getStaticPaths` no longer iterates `allWords` once per grouping
  computation. Groupings are pre-computed via `Object.groupBy` once and
  read per word.
- Speculation rules are gone: prefetching is Astro's own (`prefetch` in
  `astro.config.ts`, `prefetchAll` with the `hover` strategy).
- No build-time perf tracking or bundle-size analysis in CI; current
  performance is good. Lighthouse baselines would be the next step.

## Adapter Pipeline Health

Last verified by a full `tool:regenerate-all-words --force` pass when the demo
set held 46 words (it has since grown; the pass has not been repeated):
45/46 succeeded; "Amblypygi" (a spider order) is not in
Merriam-Webster, Wordnik, or Wiktionary so the fallback chain exhausted
cleanly and preserved the original file. Adapter chain is healthy.
