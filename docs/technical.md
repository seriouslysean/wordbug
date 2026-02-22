# Technical Documentation

Architecture reference for the occasional-wotd project. For philosophy, principles, and code standards, see [CLAUDE.md](../CLAUDE.md).

## Framework & Stack

- **[Astro](https://astro.build/)** - Static site generator, zero client-side JS by default
- **TypeScript** - Strict mode (`strictNullChecks`, `noUncheckedIndexedAccess`)
- **Node.js 24+** - Runtime (`.nvmrc` provided)
- **[Vitest](https://vitest.dev/)** - Testing framework
- **[Sharp](https://sharp.pixelplumbing.com/)** + [OpenType.js](https://opentype.js.org/) - Social image generation
- **[oxlint](https://oxc.rs/)** - Linting

## File Structure

```
src/
  content.config.ts              # Astro Content Collections config
  components/                    # Reusable Astro components
  layouts/                       # Page layout templates
  pages/                         # Route definitions
  utils/                         # Astro-specific utilities (11 files)
  styles/                        # CSS files
  assets/                        # Static assets

utils/                           # Pure Node.js utilities (11 files)
  breadcrumb-utils.ts            # Breadcrumb navigation logic
  date-utils.ts                  # Date manipulation (YYYYMMDD format)
  i18n-utils.ts                  # Translation helpers (t(), tp())
  logger.ts                      # CLI logger with Sentry (@sentry/node)
  page-metadata-utils.ts         # Page title/description generation
  text-pattern-utils.ts          # Pattern detection (palindromes, double letters, etc.)
  text-utils.ts                  # slugify(), syllable counting, re-exports
  url-utils.ts                   # URL generation for routes
  word-data-utils.ts             # Word filtering (by year, length, letter, etc.)
  word-stats-utils.ts            # Statistics calculation algorithms
  word-validation.ts             # Dictionary data validation

tools/                           # CLI tools (Node.js only, no Astro deps)
  add-word.ts                    # Add new words with validation
  generate-images.ts             # Social image generation (consolidated)
  help-utils.ts                  # Shared help system
  migrate-preserve-case.ts       # Case preservation migration
  ping-search-engines.ts         # SEO sitemap ping
  regenerate-all-words.ts        # Batch word data refresh
  utils.ts                       # Shared tool utilities

adapters/                        # Dictionary API adapters
  index.ts                       # Adapter factory
  wordnik.ts                     # Wordnik API implementation

config/
  paths.ts                       # Path configuration (SOURCE_DIR-based)

constants/
  parts-of-speech.ts             # Part of speech normalization mappings
  stats.ts                       # Statistics definitions and slugs
  text-patterns.ts               # Regex patterns, milestones, word endings
  urls.ts                        # URL constants, route builders

types/                           # Shared TypeScript definitions
  index.ts                       # Barrel export
  adapters.ts                    # DictionaryAdapter, DictionaryResponse
  common.ts                      # LogContext, PathConfig, FetchOptions, SourceMeta
  word.ts                        # WordData, WordProcessedData, stats result types
  stats.ts                       # StatsDefinition, StatsSlug, SuffixKey
  schema.ts                      # JSON-LD schema types
  seo.ts                         # SEO metadata types
  wordnik.ts                     # Wordnik API response types
  vite.d.ts                      # Build-time global declarations
  window.d.ts                    # Browser window extensions
  opentype.js.d.ts               # OpenType.js type shim

locales/
  en.json                        # English translations

tests/
  setup.js                       # Global mocks (astro:content, translations)
  helpers/spawn.js               # CLI tool process spawner
  adapters/                      # Adapter tests
  architecture/                  # Import boundary enforcement
  config/                        # Config tests
  constants/                     # Constants tests
  src/                           # Astro component/utility tests
  tools/                         # CLI integration tests
  utils/                         # Pure utility tests
```

## Environment Configuration

All environment variables are validated in `astro.config.ts` (single source of truth). See `.env.example` for the complete list with defaults.

### Required

| Variable | Purpose |
|----------|---------|
| `SITE_URL` | Canonical URL (e.g., `https://example.com`) |
| `SITE_TITLE` | Site name |
| `SITE_DESCRIPTION` | Site description for SEO |
| `SITE_ID` | Unique site identifier |

### Data & Dictionary

| Variable | Default | Purpose |
|----------|---------|---------|
| `SOURCE_DIR` | `demo` | Data source directory |
| `DICTIONARY_ADAPTER` | `wordnik` | Dictionary API to use |
| `WORDNIK_API_KEY` | — | Wordnik API key |
| `WORDNIK_API_URL` | `https://api.wordnik.com/v4` | Wordnik API endpoint |
| `WORDNIK_WEBSITE_URL` | `https://www.wordnik.com` | Wordnik website (for cross-ref links) |

### Deployment

| Variable | Default | Purpose |
|----------|---------|---------|
| `BASE_PATH` | `/` | Subdirectory for deployment |
| `SITE_LOCALE` | `en-US` | Locale for i18n |

### Feature Flags

| Variable | Default | Purpose |
|----------|---------|---------|
| `SENTRY_ENABLED` | `false` | Error tracking |
| `SENTRY_DSN` | — | Sentry data source name |
| `GA_ENABLED` | `false` | Google Analytics |
| `GA_MEASUREMENT_ID` | — | GA measurement ID |
| `SHOW_EMPTY_STATS` | `true` | Generate empty stats pages (dev convenience) |

### Theming

| Variable | Default | Purpose |
|----------|---------|---------|
| `COLOR_PRIMARY` | `#9a3412` | Primary brand color |
| `COLOR_PRIMARY_LIGHT` | `#c2410c` | Light variant |
| `COLOR_PRIMARY_DARK` | `#7c2d12` | Dark variant |

### Build-Time Globals

`astro.config.ts` injects 30+ globals via Vite `define`. These are compile-time constants (e.g., `__SITE_TITLE__`, `__BASE_URL__`, `__VERSION__`, `__RELEASE__`, `__COLOR_PRIMARY__`). They are declared in `types/vite.d.ts` for TypeScript.

## Word Data

### Storage Format

Each word is a JSON file at `data/{SOURCE_DIR}/words/{year}/{YYYYMMDD}.json`:

```json
{
  "word": "serendipity",
  "date": "20250131",
  "adapter": "wordnik",
  "data": [
    {
      "text": "The faculty of making fortunate discoveries by accident.",
      "partOfSpeech": "noun",
      "sourceDictionary": "wordnik"
    }
  ],
  "preserveCase": false
}
```

### Content Collections

Words load via Astro Content Collections at build time. `src/content.config.ts` uses `glob()` with `__WORD_DATA_PATH__` (injected by `astro.config.ts`) to find JSON files.

```typescript
export const collections = {
  words: defineCollection({
    loader: glob({ pattern: '**/*.json', base: __WORD_DATA_PATH__ })
  })
};
```

### Computed Derivatives

`src/utils/word-data-utils.ts` loads `allWords` once and derives everything from it:

```typescript
export const allWords = await getAllWords();
export const wordStats = getWordStats(allWords);
export const availableYears = getAvailableYears(allWords);
export const getWordsForYear = (year: string) => getWordsByYear(year, allWords);
```

Statistics are computed once at build time, not recalculated per page.

### Validation Rules

- Each word can only be used once across all dates (global uniqueness)
- No future dates
- Word must exist in the configured dictionary
- Strict YYYYMMDD format

## CLI Tools

All tools are pure Node.js (no Astro deps) and use `util.parseArgs()` for argument parsing.

### `add-word.ts`

Adds a word with dictionary validation, duplicate detection, and automatic image generation.

```sh
npm run tool:local tools/add-word.ts serendipity
npm run tool:local tools/add-word.ts ephemeral 20250130
npm run tool:local tools/add-word.ts Japan --preserve-case
npm run tool:local tools/add-word.ts serendipity --overwrite
```

### `generate-images.ts`

Consolidated image generation (SVG templates, Sharp PNG conversion, 1200x630px OpenGraph).

```sh
npm run tool:local tools/generate-images.ts serendipity    # Single word
npm run tool:local tools/generate-images.ts --all          # All words
npm run tool:local tools/generate-images.ts --generic      # Generic page images
npm run tool:local tools/generate-images.ts --page stats   # Specific page
```

### `regenerate-all-words.ts`

Batch refresh of word data from the dictionary API. Supports dry-run mode and rate limiting.

### `ping-search-engines.ts`

Notifies Google and Bing of sitemap updates. Designed for GitHub Actions integration.

## URL System

Two-tier system supporting root and subdirectory deployments:

| Function | Purpose | Example (`BASE_PATH="/blog"`) |
|----------|---------|-------------------------------|
| `getUrl(path)` | Relative URL with BASE_PATH | `getUrl('/words/hello')` -> `/blog/words/hello` |
| `getFullUrl(path)` | Absolute URL for SEO | `getFullUrl('/words/hello')` -> `https://example.com/blog/words/hello` |

`getFullUrl()` uses `getUrl()` internally to ensure BASE_PATH consistency.

### Route Structure

```
/                           # Homepage (current word)
/words/{word}               # Individual word pages
/{YYYYMMDD}/                # Date-based word access
/browse/                    # Browse hub
/browse/year/{year}         # Words by year
/browse/letter/{letter}     # Words by starting letter
/browse/length/{n}          # Words by length
/browse/part-of-speech/{p}  # Words by part of speech
/stats/                     # Statistics hub
/stats/{category}           # Individual stat pages
```

## Sentry Integration

Three-layer setup with separate configs per runtime:

### Browser (`sentry.client.config.js`)

`@sentry/astro` SDK with full tracing and error-only session replays. Filters browser extension noise via `ignoreErrors` and `denyUrls`.

### Server (`sentry.server.config.js`)

`@sentry/astro` SDK with tracing disabled (static site, no server-side requests to trace).

### CLI (`utils/logger.ts`)

`@sentry/node` SDK with lazy initialization. Sentry only initializes on the first `logger.error()` call, avoiding overhead for tools that succeed without errors.

The logger is a `Proxy` over `console` that intercepts all method calls. Non-error calls pass through normally. Error calls forward to Sentry with structured context:

```typescript
export const logger = new Proxy(console, {
  get(target, prop: string) {
    // ... intercepts error calls, forwards to Sentry with scope context
  },
});
```

The `isLogContext` type guard from `#types` validates the context argument before `Object.entries()` iteration. This prevents iterating over string characters or Error instance properties.

**The `exit()` helper**: Always use `await exit(code)` instead of `process.exit()` in error handlers. `process.exit()` kills in-flight async work immediately, losing pending Sentry events. `exit()` flushes first.

### Astro Logger (`src/utils/logger.ts`)

Same Proxy pattern using `@sentry/astro`. In production, suppresses non-error console output. No `exit()` needed because Astro manages the process lifecycle.

## Statistics System

All statistics computed at build time from `allWords`:

- **Letter patterns**: Palindromes, double/triple letters, alphabetical sequences, same start/end
- **Word endings**: Common suffixes (-ed, -ing, -ly, -ness, -ful, -less)
- **Letter analysis**: Most/least common letters, vowel/consonant ratios
- **Streaks**: Current and longest consecutive word streaks
- **Milestones**: 1st, 25th, 50th, 100th words, etc.

Definitions live in `constants/stats.ts`. Computation functions in `utils/word-stats-utils.ts` (pure) and `src/utils/word-stats-utils.ts` (Astro wrapper). Empty stat pages are only generated when `__SHOW_EMPTY_STATS__` is enabled.

## Image Generation

- **Templates**: Programmatic SVG with OpenType.js text measurement
- **Conversion**: Sharp PNG rasterization (1200x630px, 90% quality, 128-color palette)
- **Typography**: OpenSans Regular + ExtraBold, gradient text with theme colors
- **Output**: `public/images/social/{year}/{YYYYMMDD}-{word}.png` and `public/images/social/pages/{page}.png`

## Testing

### Layers

| Layer | Location | Speed | Purpose |
|-------|----------|-------|---------|
| Unit | `tests/utils/`, `tests/adapters/` | Fast | Pure function correctness |
| Component | `tests/src/` | Fast | Astro wrappers, SEO, schemas |
| Architecture | `tests/architecture/` | Fast | Import boundary enforcement |
| CLI Integration | `tests/tools/` | Slow | Process spawning, protocol errors |

### Coverage

Thresholds: lines 80%, functions 75%, branches 85%, statements 80%.

Excluded: build-time utilities (`static-file-utils.ts`, `static-paths-utils.ts`), pages, CLI tools (tested via integration), content config.

### Key Regression Test

The 2025-11 regression (CLI tools broke because `utils/` imported `#astro-utils/*`) is now permanently prevented by:
- `tests/architecture/utils-boundary.spec.js` — detects forbidden imports in `utils/`
- `tests/tools/cli-integration.spec.js` — catches `astro:` protocol errors in real processes

## Utility Architecture

### Two-Layer Separation

See [CLAUDE.md - The Boundary](../CLAUDE.md#the-boundary) for the principle and rationale.

**`utils/`** (pure Node.js):

| File | Purpose |
|------|---------|
| `breadcrumb-utils.ts` | Breadcrumb navigation generation |
| `date-utils.ts` | YYYYMMDD parsing, formatting, validation |
| `i18n-utils.ts` | `t()` translation, `tp()` pluralization |
| `logger.ts` | CLI Proxy logger with @sentry/node |
| `page-metadata-utils.ts` | Page titles and descriptions (cached) |
| `text-pattern-utils.ts` | Palindrome, double/triple letter detection |
| `text-utils.ts` | `slugify()`, syllable counting |
| `url-utils.ts` | Route URL builders |
| `word-data-utils.ts` | Word filtering by year/length/letter/pos |
| `word-stats-utils.ts` | Statistics computation |
| `word-validation.ts` | Dictionary data validation |

**`src/utils/`** (Astro-specific):

| File | Purpose |
|------|---------|
| `build-utils.ts` | Build metadata (version, hash, timestamp) |
| `image-utils.ts` | Social image URL generation |
| `logger.ts` | Astro Proxy logger with @sentry/astro |
| `page-metadata.ts` | Page metadata with BASE_PATH |
| `schema-utils.ts` | JSON-LD schema generation |
| `seo-utils.ts` | SEO config and meta descriptions |
| `static-file-utils.ts` | Static file generation (build-time) |
| `static-paths-utils.ts` | Dynamic static path generation |
| `url-utils.ts` | `getUrl()`, `getFullUrl()` |
| `word-data-utils.ts` | Content Collections wrapper, cached allWords |
| `word-stats-utils.ts` | Stats with Astro error handling |

### Import Boundary

| Context | Can import from | Cannot import from |
|---------|----------------|-------------------|
| `utils/` | `#utils/*`, `#types`, `#constants/*`, `#config/*`, Node built-ins | `#astro-utils/*`, `astro:*` |
| `src/utils/` | Everything above + `#astro-utils/*`, `astro:*` | — |
| `tools/` | Same as `utils/` | `#astro-utils/*`, `astro:*` |
| `src/pages/`, `src/components/` | Everything | — |

The thin-wrapper delegation pattern avoids logic duplication. See CLAUDE.md for the canonical example.

## Accessibility

- Semantic HTML with proper heading hierarchy and landmarks
- Skip-to-content link for keyboard users
- Descriptive alt text on generated images
- ARIA attributes for interactive elements
- Color contrast meeting WCAG AA
- Mobile-first responsive design

## Deployment

### GitHub Actions

```yaml
- name: Add word
  run: npm run tool:add-word ${{ github.event.inputs.word }}
  env:
    WORDNIK_API_KEY: ${{ secrets.WORDNIK_API_KEY }}
    SOURCE_DIR: ${{ vars.SOURCE_DIR }}
```

### Build Pipeline

1. Environment validation (required vars)
2. Content Collections load word data
3. Static page generation
4. Social image generation
5. Asset optimization (CSS, images)
6. Deploy to GitHub Pages or other static host

### Deployment Scenarios

```sh
# Root (example.com)
SITE_URL="https://example.com" BASE_PATH="/"

# Subdirectory (example.com/vocab/)
SITE_URL="https://example.com" BASE_PATH="/vocab"

# GitHub Pages (username.github.io/repo/)
SITE_URL="https://username.github.io" BASE_PATH="/repo"
```

## Constraints

- **Static only**: All pages pre-rendered; changes require rebuild
- **One word per date**: Each YYYYMMDD maps to exactly one word
- **Global uniqueness**: Each word used once across all dates
- **No future dates**: Words can only be added for today or past
- **Family-friendly**: Educational tone throughout
- **WCAG AA**: Accessibility compliance required

## Architecture History

### February 2026 - Codebase Audit

- Import alias migration: `~` (Vite resolve.alias) to `#` (Node.js subpath imports)
- Config conversion: `.mjs` to `.ts` (`astro.config.ts`, `vitest.config.ts`)
- TypeScript strictness: `strictNullChecks`, `noUncheckedIndexedAccess`
- DRY consolidation: stats function duplication eliminated
- ES6+ modernization: `Object.groupBy()`, `Array.findLast()`, `util.parseArgs()`
- Node.js 24 requirement (upgraded from 22)

### January 2025 - Tool Consolidation

- Unified image generation: merged separate tools into `generate-images.ts`
- Shared help system: `tools/help-utils.ts`

### Content Collections Migration

- Astro 5 Content Layer API
- Build-time path injection via `__WORD_DATA_PATH__`
