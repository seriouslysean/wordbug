# Potential Features

Quality and architectural improvements, prioritized by impact. Status markers:
✅ shipped, 🟡 partial, ⬜ open.

## ✅ Shipped: Word Enrichment Bucket

One bucket PR surfacing data the site already had, plus offline/capture-time
enrichment, search, and build-time visualizations. All code is site-agnostic
(ships downstream on sync); enrichment *data* is regenerated per site via
`npm run tool:regenerate-all-words --force` (each site's keys + corpus).

- **Word-page surfacing.** Example sentences; all definitions via a CSS
  scroll-snap slider (one sense at a time with arrows + dots, compound entries
  excluded by headword id with a fallback); a pronunciation/syllable/rarity meta
  line; self-hiding synonym/antonym/associated-word and etymology blocks.
  Components: `WordSenses`, `WordMeta`, `WordSynonyms`, `WordEtymology`.
- **Offline build-time enrichment.** SUBTLEX rarity band (`word-frequency-utils`)
  and CMU pronunciation/IPA + authoritative syllable count (`pronunciation-utils`),
  computed at build from the word string, never stored. Pinned ISC datasets in
  devDependencies. Syllable counting consolidated to one source
  (`getSyllableCount`) across word pages and stats.
- **Capture-time enrichment.** Optional word-level `enrichment` object (schema +
  type) populated at add-word/regenerate time: WordNet synonyms/antonyms/related
  terms (`adapters/wordnet.ts`, local lookup via `wordpos`/`wordnet-db`,
  offline, POS-filtered + sense-capped, best-effort) plus Merriam-Webster/Wordnik
  pronunciation, audio URL, and etymology from existing responses. Shared
  `buildWordData` keeps add-word and the backfill in sync; backfill preserves
  `preserveCase`. WordNet credited in `CREDITS.md` (no UI attribution required).
- **Static search.** Zero-dependency search behind a header magnifying-glass
  icon — a starts-with filter over the existing `/words.json`. CSP-clean
  processed script, XSS-safe rendering, hidden until JS reveals it; the All Words
  page is the no-JS fallback. Chosen over MiniSearch for simplicity.
- **Build-time visualizations** (sections on `/stats` and `/browse/[year]`): a
  CSS-Grid publishing-activity heatmap, a deterministic hand-rolled SVG
  word-connections graph gated behind `WORD_GRAPH_MIN_WORDS` (and self-hiding
  with no edges), and a per-year summary. Word cloud deferred (no weight axis on
  an equal-weight corpus).

## Tier 1: High Impact

### ✅ Cross-Page Internal Linking — SHIPPED

Word pages now show a "More Words Like This" section with up to 3 direct
word-to-word links per category (length, part of speech, year). Sections with
no other words self-hide. Picks are deterministic (alphabetical, sliced to 3)
and computed once via `Object.groupBy` in `getStaticPaths`, not per page.

Component: `src/components/WordRelated.astro`. Pure groupings live in
`utils/word-data-utils.ts` (`groupWordsByLength`, `groupWordsByLetter`,
`groupWordsByPartOfSpeech`, `groupWordsByYear`).

### 🟡 SEO Audit & Schema Enhancement — PARTIAL

**Done:**
- `inLanguage` added to WebSite, DefinedTerm, and CollectionPage JSON-LD
  schemas, sourced from `SITE_LOCALE`.
- Conditional `og:type=article` for `STRUCTURED_DATA_TYPE.WORD_SINGLE`,
  `website` for everything else. Homepage emits `article` today because it
  features the current word — revisit if homepage feels more like a hub.

**Remaining:**
- CollectionPage `mainEntity.itemListElement[]` not populated. Currently emits
  `numberOfItems` only. Plumb the word list (or a slice of it) from
  `BrowsePageTemplate` into `getCollectionSchemaData` so each item shows up.
- Schema.org `WordDefinition` markup — DefinedTerm already covers the
  semantic; verify with Google Rich Results test before adding a parallel
  schema.
- Audit existing canonical URLs against `hreflang` policy if multi-locale
  support is ever planned.

### ⬜ BEM Naming Cleanup + CSS Architecture (combined)

Plan from a planning pass. The two are entangled: most "BEM violations" are
dead CSS left behind because stats umbrella pages duplicate what
`StatsSection` and `StatsPageTemplate` already provide. Fix the architecture
and the BEM issues disappear.

**Real bug found (load-bearing):** `src/pages/stats/streaks.astro:65-67`
references `.stats__list`, `.stats__fact`, `.stats__value`, `.stats__chart`.
Those rules exist only in scoped `<style>` of `src/pages/stats.astro:227-289`.
Astro scoped styles hash per-component, so the `<dl>` on `/stats/streaks`
renders unstyled.

**Class inventory (file:line — issue):**
- `src/pages/stats.astro:154` — `<main class="stats">` plus
  `.stats__list/__fact/__value/__chart`. Page-as-block; duplicates
  `StatsSection` rules at 215-225 and milestone rules in
  `StatsMilestonePage.astro:31-80`.
- `src/pages/stats/word-facts.astro:81` — `<main class="word-facts">` plus
  dead `.word-facts__section/__heading`. No element on the page uses them.
- `src/pages/stats/word-endings.astro:24,29,30` — `.word-endings`,
  `__section`, `__heading`. Hand-rolls what `<StatsSection>` provides.
- `src/pages/stats/letter-patterns.astro:30,35,36` — same as word-endings.
- `src/pages/stats/streaks.astro:52,65-67` — broken `stats__*` refs above.
- `src/pages/word/index.astro:28,37` — `.words__section` element without a
  `.words` block.
- `src/pages/browse/index.astro:70-118` — `.browse__section`, `.browse__grid`,
  `.browse__grid-item` with no `.browse` block on the page.

**CSS architecture findings:**
- `src/components/WordList.astro:82` — `padding: var(--spacing-xl) 0`
  references undefined token; theme.css only defines `xs/small/base/large`.
- `src/components/BarChart.astro:48,77,81,88,92,98,102,106,111` — hex-literal
  fallbacks on every `var(--color-*)`. Tokens are guaranteed by
  `Layout.astro`; fallbacks duplicate defaults and obscure theming.
- `src/styles/theme.css:38` — `--color-black` has zero references.
- `src/styles/theme.css:34` — `--color-text` used in only 2 files; everything
  else uses `--color-text-primary`. Verify visual intent before consolidating.
- Hardcoded literals bypassing tokens: `1.1rem` at `stats.astro:240`,
  `StatsMilestonePage.astro:48`, `WordLink.astro:42`; `0.875rem` at
  `Header.astro:22`, `Footer.astro:66`.
- Media query inconsistency: `768px` (WordContext, WordRelated, browse/index)
  vs `1025px` (Layout, DefinitionList, WordList, WordNav, WordLink,
  StatsMilestonePage, stats.astro). No breakpoint tokens.
- Duplicate rule block: `.stats__heading`, `.stats-section__heading`,
  `.word-facts__heading`, `.word-endings__heading`,
  `.letter-patterns__heading` — five identical rule sets.

**Acceptance criteria:**
- All four `src/pages/stats/*.astro` umbrella pages render via
  `StatsPageTemplate` + `StatsSection`; no per-page `__section`/`__heading`
  rules remain.
- `/stats/streaks` renders the BarChart `<dl>` with the same visual styling
  as `/stats`.
- No `var(--*)` reference points to an undefined token.
- Every class on every page belongs to a defined block.
- All quality gates pass.

**Step sequence:**
1. Convert `streaks.astro`, `word-endings.astro`, `letter-patterns.astro`,
   `word-facts.astro` to use `StatsPageTemplate` + `<StatsSection>`. Delete
   each page's scoped `<style>` block.
2. Refactor `stats.astro` to use `StatsPageTemplate`. Extract the
   streak-vs-gap BarChart `<dl>` into a small component
   (`StatsComparisonBar.astro`) with its own scoped styles; use on both
   `stats.astro` and `streaks.astro`.
3. In `src/pages/word/index.astro` and `src/pages/browse/index.astro`, add
   the parent block class on the outer container.
4. Fix `WordList.astro:82` `--spacing-xl` → `--spacing-large`.
5. Strip hex fallbacks from `BarChart.astro` token references.
6. Remove `--color-black` from `theme.css`.
7. Replace hardcoded `1.1rem`/`0.875rem` literals with
   `--font-size-medium`/`--font-size-small`.
8. Run quality gates and visually confirm `/stats/*` in built `dist/`.

**Out of scope:** CSS preprocessor, utility framework, dark-mode rework,
breakpoint token introduction, renaming `.stats-section`.

### ⬜ Accessibility Audit

Site already passes the easy WCAG wins. Remaining work is preventive: making
dark-mode contrast verifiable so future `COLOR_DARK_*` env changes can't
silently ship a fail.

**Current state inventory:**
- Skip link present and keyboard-reachable: `src/layouts/Layout.astro:198`.
- Global focus ring (2px outline, primary color):
  `src/styles/global.css:107-112`.
- Per-component focus styles: `src/styles/global.css:79, 99`.
- Landmarks: `<main id="main-content">`, `<footer role="contentinfo">`.
- E2E a11y coverage: `tests/e2e/accessibility.spec.ts:7-61`.
- Dark-mode wiring: env overrides assembled `Layout.astro:77-86`, injected
  via `<style>`, `theme-color` meta `Layout.astro:119-121`. Dark env vars
  all optional with no defaults (`astro.config.ts:108-115`); unset values
  fall back to light tokens.

**Concrete gaps:**
- No programmatic contrast verification, light or dark.
- No `axe-core` dependency.
- Partial-override hazard: setting `COLOR_DARK_BACKGROUND` alone leaves
  `--color-primary` at light-theme value, producing low-contrast focus rings
  and links on dark bg.

**Dark mode contrast verification plan — pick A:**

**A. Build-time check (recommended).** `tools/check-contrast.ts` imports the
validated env from `astro.config.ts`, resolves the effective dark palette via
the same fallback logic in `Layout.astro:77-86`, computes WCAG relative-
luminance ratios for the pairs that actually render together, and exits
non-zero on fail. Wire into `npm run build`.

Pairs to check (≥ 4.5:1 except border):
- `--color-background` × `--color-text`, `--color-text-light`
- `--color-background-light` × `--color-text`, `--color-text-light`
- `--color-background` × `--color-primary` (focus outline, link text)
- `--color-background` × `--color-border` (≥ 3:1, UI component threshold)

**B. Runtime axe-core in E2E.** `@axe-core/playwright`, new spec asserts
`axe.run()` returns zero contrast violations. Requires a dark-mode CI
variant. Add later if rendered-state regressions appear.

**Acceptance criteria:**
- `tools/check-contrast.ts` exits non-zero on threshold fail.
- Script runs as part of `npm run build` or quality gate.
- Unit tests cover the luminance calculator and fallback-resolution logic.
- Failure message names offending pair, both hex values, computed ratio.
- Documented in `docs/technical.md`.

**Step sequence:**
1. Pure luminance + contrast-ratio helper in `utils/contrast-utils.ts`.
2. Dark-palette resolver mirroring `Layout.astro:77-86` in same module.
3. `tools/check-contrast.ts` CLI: read env, resolve palette, check pairs.
4. Unit tests for helper + resolver.
5. CLI integration test in `tests/tools/`.
6. Wire into `package.json` as `prebuild` or explicit gate step.
7. Document in `docs/technical.md` and `.env.example`.

**Out-of-scope:** Theme toggle UI (Tier 4), WCAG AAA, light-mode re-audit,
manual screen-reader testing, axe integration, non-color a11y additions.

### 🟡 Performance Audit — PARTIAL

**Done:**
- Per-word `getStaticPaths` O(n²) iteration replaced with one-shot
  `Object.groupBy` calls (`src/pages/word/[word].astro`).
- Speculation rules `eagerness` reduced from `eager` to `moderate` on the
  hub-URL list, eliminating eager prefetches for unclicked pages.

**Remaining:**
- Lighthouse baseline scores not captured in CI.
- Bundle size analysis not tracked.
- Font loading: system fonts only today; no work needed unless a web font is
  introduced.
- Critical CSS extraction not implemented; CSS is ~8.6K bundled so payoff
  is marginal.

### ⬜ Architecture & Code Quality

Consolidate duplicated grouping logic between `utils/word-data-utils.ts`
and `src/utils/word-data-utils.ts`, extend the boundary test to cover the
new functions, and collapse the one-liner URL helpers in
`src/utils/url-utils.ts`.

**Duplication inventory.** Four `groupWordsBy*` functions exist in both
files with divergent semantics:

| Function | `utils/word-data-utils.ts` | `src/utils/word-data-utils.ts` |
|---|---|---|
| `groupWordsByLength` | L192-193: raw `Object.groupBy`, keys unsorted | L361-369: sorts keys ascending, coerces `undefined` buckets to `[]` |
| `groupWordsByLetter` | L198-199: raw on `charAt(0).toLowerCase()`, all words | L388-397: pre-filters `/^[a-z]/i`, sorts keys, sorts each bucket by `localeCompare` |
| `groupWordsByYear` | L204-205: raw `Object.groupBy` | L345-350: coerces `undefined` buckets to `[]`, no sort |
| `groupWordsByPartOfSpeech` | L211-231: per-word `Set` dedup by normalized POS | L416-449: dedups within bucket by `word.date`, sorts keys + words, uses `normalizeToBasePOS` (drops non-base) |

**Consolidation strategy.** Pure `utils/` becomes the single owner. Pure
functions gain alphabetical key sort, per-bucket `localeCompare` sort,
alphabetic-only filter for letter, and `normalizeToBasePOS` filtering for
POS. Wrapper functions become thin delegators. Rationale: callers already
expect sorted output for templates; the pure version is not used outside
the wrapper today, so tightening it has no external consumer.

**`url-utils.ts` thin-wrapper review.** 40 exported helpers; 23 are
single-expression wrappers around `ROUTES.STAT(STATS_SLUGS.X)` or
`BASE_PATHS.X`. Only `src/pages/stats.astro` and
`src/pages/stats/letter-patterns.astro` call them. Recommend deletion;
call sites switch to `ROUTES.STAT(STATS_SLUGS.X)` directly. Keep the
helpers that do real work: `getBasePath`, `getPathname`, `getUrl`,
`getFullUrl`, `getWordUrl`, `stripBasePath`, `getWordsYearUrl`
(conditional branch), and the parametric `getLengthUrl` /
`getLetterUrl` / `getPartOfSpeechUrl` / `getMonthUrl` / `getStatUrl`.

**Acceptance criteria:**
- `src/utils/word-data-utils.ts` contains no `Object.groupBy` calls; all
  four `groupWordsBy*` exports are one-line delegators.
- Stats pages render identical HTML before and after — verified by diffing
  `dist/stats/**`.
- Architecture test asserts `groupWordsByLength` etc. are imported from
  `#utils/word-data-utils`.
- `src/utils/url-utils.ts` exports drop from 40 to ~17.

**Step sequence:**
1. Move sort + filter + dedup semantics from wrapper into pure utils.
2. Update unit tests to cover sorted keys, sorted buckets, alphabetic-only
   letter filter, base-POS-only filter.
3. Replace wrapper bodies with one-line delegators.
4. Extend `tests/architecture/utils-boundary.spec.js` to include the four
   `groupWordsBy*` names.
5. Delete the 23 zero-arg `STATS_SLUGS`/`BASE_PATHS`/`BROWSE_PATHS`
   wrappers in `src/utils/url-utils.ts`.
6. Update the two stats pages to import constants directly.
7. Diff `dist/stats/index.html` and `dist/stats/letter-patterns/index.html`
   against pre-change build.
8. Run all gates.

**Out-of-scope:** renaming exports, changes to `ROUTES`/`BASE_PATHS`/
`BROWSE_PATHS`/`STATS_SLUGS` shape, new abstractions (`urlFor()`),
adapters/logger/stats-math changes.

### 🟡 TypeScript Consolidation — PARTIAL

**Done:**
- `WordGrouping<K>` generic added to `types/word.ts`. The three
  `WordGroupBy*Result` aliases now share this single shape.
- Four unused types removed: `WordLengthStat`, `WordLetterStatsResult`,
  `WordMilestoneResult`, `WordFileGlobImport`.
- Three unused stats aliases removed: `SuffixDefinition`,
  `LetterPatternDefinition`, `PatternDefinition`.
- `findValidDefinition` tightened from `any[]` to `DictionaryDefinition[]`.
- `secondaryText` callback param narrowed from `data?: any` to
  `count: number` (every call site passes a count).
- `t()` i18n traversal replaced `(obj: any)` reduce with proper
  unknown-narrowing.

**Remaining:**
- Adapter-side types (`MerriamWebster*`, `Wordnik*`,
  `FreeDictionary*`) — 16+ interfaces. They mirror API contracts and stay
  per-adapter. No consolidation indicated.
- A handful of `as Type` assertions in adapter parsers remain — justified
  by third-party tuple-union shapes (`adapters/merriam-webster.ts:88, 110,
  115, 118, 183`). Removing them requires recursive type reconstruction
  for diminishing return.
- Astro component prop spread uses `[key: string]: any` — standard Astro
  pattern; not a real `any` hole.

### ⬜ Astro Best Practices (responsive images + complete astro:env)

Pairs the Astro 6.x image component rollout with finishing the `astro:env`
migration. The type-safe env API is already partially adopted —
`src/utils/seo-utils.ts` imports from `astro:env/client`. One file still
reads `import.meta.env.SOURCE_DIR` directly.

**Responsive image inventory:**
- `src/components/Footer.astro:44` — Wordnik logo, imported as
  `#assets/wordnik-gearheart.png`. Convert to `<Image>` from `astro:assets`
  (16x16, `loading="lazy"`, `decoding="async"`).
- `src/layouts/Layout.astro:148,155` — `og:image`/`twitter:image` URLs.
  Stay as string URLs (pre-generated PNGs in `public/`). Out of scope.
- `src/pages/favicon.ico.ts`, manifest, SVG favicon — SVG, no transform
  needed.

**astro:env adoption gaps:**
- `src/utils/image-utils.ts:12` — `import.meta.env.SOURCE_DIR`. Add
  `SOURCE_DIR: envField.string({ context: 'client', access: 'public',
  default: '' })` to schema and migrate.
- `astro.config.ts:46,137-138` — `WORDNIK_WEBSITE_URL` declared in
  `defaults` but never schemaed. Add the entry.
- `src/utils/logger.ts:12,34` — `import.meta.env.DEV` and
  `import.meta.env.npm_package_version`. Vite-provided. Keep as-is.
- `utils/logger.ts:12,21-27` — `process.env.SENTRY_*`. Must stay
  `process.env`; boundary rule forbids `astro:*` outside `src/`.

**Acceptance criteria:**
- Footer Wordnik logo renders via `<Image>`; build output shows hashed,
  optimized asset; visual diff identical at 16x16.
- `astro:env/client` schema includes `SOURCE_DIR`, `WORDNIK_WEBSITE_URL`.
- No `import.meta.env.SOURCE_DIR` references remain in `src/`.
- Boundary tests still green.
- Lighthouse on `/` and a word page: no regression on LCP/CLS.

**Step sequence:**
1. Add `SOURCE_DIR` and `WORDNIK_WEBSITE_URL` to env schema.
2. Migrate `src/utils/image-utils.ts:12` to `astro:env/client`.
3. Replace `<img>` in `src/components/Footer.astro` with `<Image>`.
4. Verify `:global(.footer__wordnik)` grayscale/opacity styles still
   target the new wrapper.
5. Run typecheck, build, inspect `dist/` for hashed image output.
6. Run unit + E2E suites.
7. Audit speculation rules `eagerness` against a long browse page; tune
   if prefetch volume is excessive.

**Out-of-scope:** Astro DB, SSR adapters, server islands, Astro ClientRouter
(JS-based; removed — native CSS view transitions are implemented),
migrating CLI-side `utils/logger.ts` env access (boundary), re-encoding
pre-generated social PNGs through `astro:assets`, SVG favicon to `<Image>`.

## Tier 2: Medium Impact

### i18n/Localization Audit

Review hardcoded strings, verify UI text uses translation keys, check
date/number formatting consistency.

### Stats Definition Architecture

Scattered definitions across multiple files with complex interdependencies.
A unified stats registry with self-describing objects would simplify adding
new stats.

### Error Handling Consistency

Standardize error patterns (throw vs null vs log) with proper error types.
See [backlog.md](backlog.md).

### ✅ Client-Side Search — SHIPPED

Zero-dependency starts-with search behind a header magnifying-glass icon, over
the existing `/words.json`. Progressive enhancement with a no-JS fallback (the
All Words page). See the Word Enrichment Bucket above.

## Tier 3: Lower Impact

### Test Coverage Completion

Fill remaining coverage gaps in `static-file-utils.ts` and
`static-paths-utils.ts`.

### Stats Category Directory Pages

Landing pages for Word Facts, Letter Patterns, Word Endings sections. Better
content discoverability and SEO.

### Enhanced Programmatic Stats

Chart-ready statistics: starting letter frequency distribution, word length
histograms, curated common endings.

## Tier 4: Nice-to-Have

### Theme Switching (Dark/Light Mode)

System preference detection with manual toggle. CSS custom properties with
JS toggle. Tradeoff: the site ships zero application JavaScript by default
(no UI framework or hydration); the only client-side JS is Astro's prefetch
runtime and small progressive enhancements — native CSS view transitions
ship no JS.

### Word Bookmarking

Personal favorites via LocalStorage. Client-side only, no server dependency.

## Notes

The codebase is well-maintained. Most improvements take it from "excellent"
to "perfect." The utils/src-utils architectural separation is a genuine
strength and should be preserved. Performance already meets requirements —
optimizations would be incremental.
