# Technical Documentation

Architecture reference for the occasional-wotd project. For philosophy, principles, and code standards, see [AGENTS.md](../AGENTS.md) (also available via the `CLAUDE.md` symlink).

## Framework & Stack

- **[Astro](https://astro.build/)** - Static site generator; zero application JavaScript by default — no UI framework or hydration; only Astro's prefetch runtime and small progressive enhancements ship; native CSS view transitions ship no JS
- **TypeScript** - Strict mode (`strictNullChecks`, `noUncheckedIndexedAccess`)
- **Node.js 26+** - Runtime (`.nvmrc` provided)
- **[Vitest](https://vitest.dev/)** - Unit, component, and integration testing
- **[Playwright](https://playwright.dev/)** - E2E testing against the built static site
- **[Sharp](https://sharp.pixelplumbing.com/)** + [OpenType.js](https://opentype.js.org/) - Social image generation
- **[oxlint](https://oxc.rs/)** - Linting

## File Structure

```
src/
  content.config.ts              # Astro Content Collections config
  components/                    # Reusable Astro components
  layouts/                       # Page layout templates
  pages/                         # Route definitions
  utils/                         # Astro-specific utilities (10 files)
  styles/                        # CSS files
  assets/                        # Static assets

utils/                           # Pure Node.js utilities (29 files)
  adapter-utils.ts               # Shared adapter helpers (POS, definition builders, canonical guard, HTTP)
  attribution-utils.ts           # Which dictionaries a site owes credit, and which licence a word page names
  breadcrumb-utils.ts            # Breadcrumb navigation logic
  date-utils.ts                  # Date manipulation (YYYYMMDD format)
  definition-markup.ts          # Definition tag recognition and strict legacy validation
  definition-text.ts             # Definition markup parser, cross-reference checks, definition segments
  i18n-utils.ts                  # Translation helpers (t(), tp()), og:locale form of a locale
  logger-core.ts                 # Logger factory (SentryBridge + output filter)
  logger.ts                      # CLI logger wrapper (@sentry/node)
  sentry-options.ts              # Sentry options pinned to SDK 10 behaviour (all three inits)
  page-metadata-utils.ts         # Page title/description generation
  text-pattern-utils.ts          # Pattern detection (palindromes, double letters, etc.)
  text-utils.ts                  # slugify(), syllable counting, re-exports
  url-utils.ts                   # URL generation for routes
  stored-word-validation.ts      # Canonical stored-word shape guards
  word-data-normalizer.ts        # Offline legacy-record normalization
  word-data-utils.ts             # Displayability rule, word filtering (by year, length, letter, etc.)
  word-stats-utils.ts            # Statistics calculation algorithms
  word-validation.ts             # Client-safe words.json index guard

tools/                           # CLI tools (Node.js only, no Astro deps)
  add-word.ts                    # Add new words with validation
  generate-images.ts             # Social image generation (consolidated)
  help-utils.ts                  # Shared help system
  normalize-word-data.ts         # Offline stored-data migration
  regenerate-all-words.ts        # Batch word data refresh
  sync-upstream.sh               # Merge upstream into a downstream site, gated (tool:sync)
  utils.ts                       # Shared tool utilities
  word-file-paths.ts             # Which files are word files: the content loader's rule

adapters/                        # Dictionary API adapters
  index.ts                       # Adapter registry + fallback chain
  merriam-webster.ts             # Merriam-Webster Collegiate API
  wiktionary.ts                  # Wiktionary, through Wikimedia's definition endpoint

config/
  paths.ts                       # Path configuration (SOURCE_DIR-based)

constants/
  parts-of-speech.ts             # Part-of-speech vocabulary (grammatical categories plus abbreviation)
  stats.ts                       # Statistics definitions and slugs
  text-patterns.ts               # Regex patterns, milestones, word endings
  urls.ts                        # URL constants, route builders

types/                           # Shared TypeScript definitions
  index.ts                       # Barrel export
  adapters.ts                    # DictionaryAdapter, DictionaryResponse
  common.ts                      # LogContext, PathConfig, FetchOptions, SourceMeta, DictionaryDefinition, DictionaryReference
  word.ts                        # WordData, WordProcessedData, WordSense, DefinitionSegment, stats result types
  stats.ts                       # StatsDefinition, StatsSlug, SuffixKey
  schema.ts                      # JSON-LD schema types
  seo.ts                         # SEO metadata types
  merriam-webster.ts             # MW API response types
  wiktionary.ts                  # Wiktionary definition endpoint types
  vite.d.ts                      # Build-time global declarations
  opentype.js.d.ts               # OpenType.js type shim

locales/
  en.json                        # English translations

tests/
  setup.ts                       # Global mocks (astro:env/client, astro:content, translations)
  helpers/spawn.ts               # CLI tool process spawner
  helpers/log-levels.ts          # Preload that marks a spawned tool's warn and error lines
  adapters/                      # Adapter tests and contract suite (Vitest)
  adapters/fixtures/<adapter>/   # Partner response bodies, one directory per registered adapter
  architecture/                  # Import boundary enforcement (Vitest)
  config/                        # Config tests (Vitest)
  constants/                     # Constants tests (Vitest)
  e2e/                           # E2E tests against built site (Playwright)
  src/                           # Astro component/utility tests (Vitest)
  tools/                         # CLI integration tests (Vitest)
  utils/                         # Pure utility tests (Vitest)

.agents/                         # Agent skills (tool-agnostic)
  skills/                        # validate, commit, pr workflows

.claude/                         # Claude Code config
  hooks/                         # Safety hooks (destructive commands, main branch guard)
  settings.json                  # Shared permissions and hook registrations
  skills -> ../.agents/skills/   # Symlink to agent skills

.github/
  actionlint.yaml                # actionlint configuration
  actions/setup-env/             # Composite action: repository variables and secrets into the job
  workflows/                     # CI: lint, typecheck, test, build, e2e; add-word; deploy
    site-deploy.yml              # Reusable build and deploy that Deploy calls
    site-add-word.yml            # Reusable Add Word that Add Word calls
  copilot-instructions.md        # GitHub Copilot guidelines
  instructions/                  # Scoped Copilot instructions (review focus)
  pull_request_template.md       # PR body template
```

## Environment Configuration

All environment variables are validated in `astro.config.ts` (single source of truth). See `.env.example` for the complete list with defaults.

`astro.config.ts` loads `.env` into `process.env` whenever the file is there, with `CI` set or not, and a variable the environment already sets wins over the file. The config (`site`, `base`, the word data path, whether Sentry is on) and `astro:env` (the URL helpers, the components) then read one value: `astro:env` reads `.env` itself through Vite, which lets `process.env` override the file. A workflow has no `.env`; `setup-env` exports the repository's variables. `.env` is the only file the config loads: Vite's mode files (`.env.local`, `.env.production`) reach `astro:env` and not the config, so a setting put there splits the two. Keep settings in `.env` or the environment.

### Required

| Variable | Purpose |
|----------|---------|
| `SITE_URL` | The site's origin (e.g., `https://example.com`); the build refuses a value that is not a URL |
| `SITE_TITLE` | Site name, as readers and crawlers see it: page titles, `og:site_name`, JSON-LD names, the feed title, the manifest `name` and the suffix of a word page's meta description (`word: definition \| SITE_TITLE`, from `getMetaDescription()` in `src/utils/seo-utils.ts`) |
| `SITE_DESCRIPTION` | Site description for SEO |
| `SITE_ID` | Machine identifier: the site tag on log events and the optional `public/ascii-{SITE_ID}.txt`. Never rendered to a reader |

### Data & Dictionary

| Variable | Default | Purpose |
|----------|---------|---------|
| `SOURCE_DIR` | `''` | Data source subdirectory (unset = root paths) |
| `DICTIONARY_ADAPTER` | — | Primary dictionary API (`merriam-webster`, `wiktionary`); no default, `add-word` and `regenerate-all-words` refuse to run without it |
| `DICTIONARY_FALLBACK` | `wiktionary` | Fallback chain, comma-separated; empty means the default Wiktionary fallback, `none` (any case) disables it. Every name is resolved before the first lookup, so one that is no adapter (`wordnik`, removed) fails add-word and regenerate-all-words at once with the valid names, whether or not the primary has the word |
| `MERRIAM_WEBSTER_API_KEY` | — | Merriam-Webster API key |
| `MERRIAM_WEBSTER_API_URL` | `https://dictionaryapi.com/api/v3/references` | MW API endpoint |
| `MERRIAM_WEBSTER_DICTIONARY` | `collegiate` | MW dictionary edition |
| `WIKTIONARY_API_URL` | `https://en.wiktionary.org/api/rest_v1` | Wikimedia REST API the Wiktionary adapter asks; no key. For the CLI tools and tests only: `setup-env` does not carry it into a workflow |

### Deployment

| Variable | Default | Purpose |
|----------|---------|---------|
| `BASE_PATH` | `/` | Subdirectory for deployment (`/blog`). `astro.config.ts` adds a missing leading slash, so `blog` builds the same site |
| `SITE_LOCALE` | `en-US` | BCP 47 locale: `<html lang>`, the feed and manifest language, and `og:locale` as `language_REGION` (`en_US`), left out when the locale names no region |

### Site Metadata

| Variable | Default | Purpose |
|----------|---------|---------|
| `SITE_AUTHOR` | `''` | Author name for attribution |
| `SITE_AUTHOR_URL` | `''` | Author website URL |
| `SITE_ATTRIBUTION_MESSAGE` | `''` | Custom attribution text |
| `SITE_KEYWORDS` | `''` | SEO keywords (comma-separated) |
| `SITE_SHORT_NAME` | — | Manifest `short_name`: the home-screen label for when `SITE_TITLE` is too long to fit under an icon. Unset leaves the member out and the launcher shortens `name` itself |

### humans.txt

| Variable | Default | Purpose |
|----------|---------|---------|
| `HUMANS_WORD_CURATOR` | `''` | Word curator name |
| `HUMANS_DEVELOPER_NAME` | `''` | Developer name |
| `HUMANS_DEVELOPER_CONTACT` | `''` | Developer contact |
| `HUMANS_DEVELOPER_SITE` | `''` | Developer website |

### Feature Flags

| Variable | Default | Purpose |
|----------|---------|---------|
| `SENTRY_ENABLED` | `false` | Error tracking |
| `SENTRY_DSN` | — | Sentry data source name |
| `SENTRY_ORG` | — | Sentry organization |
| `SENTRY_PROJECT` | — | Sentry project name |
| `SENTRY_AUTH_TOKEN` | — | Sentry auth token (sourcemap uploads) |
| `SENTRY_ENVIRONMENT` | `development` | Sentry environment tag |
| `SENTRY_RELEASE` | auto-generated | Release identifier (`name@version+hash`) |
| `GA_ENABLED` | `false` | Google Analytics |
| `GA_MEASUREMENT_ID` | — | GA measurement ID |

### Theming

| Variable | Default | Purpose |
|----------|---------|---------|
| `COLOR_PRIMARY` | `#9a3412` | Primary brand color |
| `COLOR_PRIMARY_LIGHT` | `#c2410c` | Light variant |
| `COLOR_PRIMARY_DARK` | `#7c2d12` | Dark variant |

### Dark Mode

Opt-in via environment variables. Setting `COLOR_DARK_BACKGROUND` activates dark mode — it's the minimum viable dark palette. All other dark vars are optional; unset ones fall back to the light-mode value.

| Variable | Maps to | Fallback |
|----------|---------|----------|
| `COLOR_DARK_BACKGROUND` | `--color-background` | *(enablement trigger)* |
| `COLOR_DARK_BACKGROUND_LIGHT` | `--color-background-light` | light value |
| `COLOR_DARK_PRIMARY` | `--color-primary` | light value |
| `COLOR_DARK_PRIMARY_LIGHT` | `--color-primary-light` | light value |
| `COLOR_DARK_PRIMARY_DARK` | `--color-primary-dark` | light value |
| `COLOR_DARK_TEXT` | `--color-text` | light value |
| `COLOR_DARK_TEXT_LIGHT` | `--color-text-light` | light value |
| `COLOR_DARK_BORDER` | `--color-border` | light value |

When enabled, the `/theme.css` endpoint (`src/pages/theme.css.ts`) emits a `@media (prefers-color-scheme: dark)` block with the configured overrides, and `Layout.astro` adds a dark-variant `<meta name="theme-color">`. No JavaScript required — respects the user's system preference. When no dark vars are set, the site is light-only with no dark mode CSS emitted.

### Environment Access

Environment variables in `src/` code are accessed via Astro's type-safe `astro:env/client` module. The schema is defined in `astro.config.ts` using `envField` — this provides validation, defaults, and TypeScript types. All env vars use `context: 'client'` since this is a fully static site with no secrets.

Four computed build-time constants remain as Vite `define` globals (declared in `types/vite.d.ts`):

| Global | Purpose |
|--------|---------|
| `__VERSION__` | Package version from `package.json` |
| `__RELEASE__` | Release identifier (`name@version+hash`) |
| `__TIMESTAMP__` | Build timestamp (ISO 8601) |
| `__WORD_DATA_PATH__` | Resolved word data directory path |

## Word Data

### Storage Format

Each word is a JSON file at `data/[{SOURCE_DIR}/]words/{year}/{YYYYMMDD}.json` (the `SOURCE_DIR` segment is included only when set):

```json
{
  "word": "serendipity",
  "date": "20250131",
  "adapter": "wiktionary",
  "data": [
    {
      "text": "The faculty of making fortunate discoveries by accident.",
      "partOfSpeech": "noun",
      "sourceDictionary": "wiktionary"
    }
  ],
  "preserveCase": false
}
```

A definition a site stored from Wordnik, before that adapter was removed, may also carry `references`, ranges of its `text` that link elsewhere; no adapter writes them now (see Dictionary Credit). The offline normalizer converts older Wordnik markup to those ranges before the site reads the record. It also removes legacy American Heritage sense IDs matching `C5067000-1` (one uppercase letter, seven digits, a hyphen and digits) from Wordnik definitions, while preserving entry headwords. Other unrecognized ID formats are left unchanged.

**Upgrading to 3.28:** after `npm run tool:sync`, run `npm run tool:normalize-word-data -- --dry-run`, inspect the changes, then run `npm run tool:normalize-word-data` and commit changed records on the sync branch before its first deployment. Sync does not run the normalizer automatically. Legacy Wordnik sense IDs can otherwise change the primary definition used in metadata and feeds. For the data audited on 10 October 2026, wordbun needs `2025/20251103.json` ("candy corn") normalized and wordbug needs no changes; rerun the dry-run because site data can change.

### Demo Data

The demo words (`data/demo/words/`, built with `SOURCE_DIR=demo`) spell the site title on the homepage: the current word `occasional` (20250121), then `word`, `of`, `the`, `day` (20250117) as the previous words. New demo words must be dated before 20250117; `tests/src/pages/index.spec.ts` fails on any demo word dated later.

### Content Collections

Words load via Astro Content Collections at build time. `src/content.config.ts` uses `glob()` with `__WORD_DATA_PATH__` (injected by `astro.config.ts`) to find JSON files.

```typescript
export const collections = {
  words: defineCollection({
    loader: glob({ pattern: '**/*.json', base: __WORD_DATA_PATH__ })
  })
};
```

The CLI tools read the same files. `listWordFilePaths()` in `tools/word-file-paths.ts` applies the loader's rule (every `.json` file at any depth under the words directory, no file or directory whose name starts with a dot, symbolic links followed), and `getWordFiles()` (add-word, generate-images, regenerate-all-words) and normalize-word-data both list the corpus through it, so the tools agree with each other and with the build on which files hold a word. Each word's date is the one its record stores, as the build reads it, never the file name: `getWordFiles()` reports a file with no valid `date` as a failure, and regenerate-all-words holds the record it is about to write to `isWordData` and refuses an invalid one, leaving the file as it was. One difference is deliberate: the loader lists a directory that a link also points to under both paths, and the tools list it once, under the path that sorts first, so no word is processed twice. A directory that cannot be listed is a failure, not an empty one. add-word writes `{year}/{YYYYMMDD}.json`; a word file placed anywhere else under the words directory is still built and still read. add-word scans the corpus once and answers its date, word and slug checks from that scan: a date is taken when any file stores it, and `--overwrite` replaces that file where it is.

### Computed Derivatives

`src/utils/word-data-utils.ts` loads `allWords` once and derives everything from it:

```typescript
export const allWords = await getAllWords();
export const wordStats = getWordStats(allWords);
export const availableYears = getAvailableYears(allWords);
export const getWordsForYear = (year: string) => getWordsByYear(year, allWords);
```

Statistics are computed once at build time, not recalculated per page.

### i18n

All user-facing strings go through `locales/en.json`. The `t(key)` function from `utils/i18n-utils.ts` returns the translation, and `tp(key, count)` handles pluralization. Translation keys use dot notation (`words.count`, `stats.title`). Components and utilities import `t()` directly -- no framework-level i18n integration. Adding a new string means adding the key to `en.json` and using `t('key')` at the call site.

### Validation Rules

- Each word can only be used once across all dates (global uniqueness)
- No future dates
- Word must exist in the configured dictionary
- The dictionary's answer must contain at least one displayable definition (see below); otherwise the fallback chain moves on, and an exhausted chain fails the add
- Strict YYYYMMDD format

### Displayable Definitions

`getDisplayableDefinitions()` in `utils/word-data-utils.ts` is the one rule for which definitions can be displayed. A definition is displayable when it has a part of speech and non-empty text. Abbreviation-labelled definitions are displayable only when the word has no displayable grammatical definition: a lookup of "sad" also returns SAD, "seasonal affective disorder", which must not become a sense of the adjective, while "pb&j" has nothing but its abbreviation, so that is what its page shows.

Everything that shows, counts, groups or accepts definitions goes through it: the word page senses (`getWordSenses`), the primary definition used for meta descriptions, RSS and JSON-LD (`findValidDefinition`) and for the source link (`getWordDetails`), the part-of-speech browse pages (`getAvailablePartsOfSpeech`, `getWordsByPartOfSpeech`, `groupWordsByPartOfSpeech`), the parts-of-speech stat, which counts those groups (`getPartOfSpeechStats`), and add-time acceptance (`isValidDictionaryData`, checked by `fetchWithFallback` on every adapter's answer, so the tools only ever receive usable definitions). A record with text but no part of speech is refused at add time because no page could display it; a `label` (see Dictionary Adapters) is not a part of speech.

A lookup also returns compound and derived entries with the headword: "happy hour", a noun, comes back with "happy", and "read", a verb, with "reading". `getWordDefinitions()` in the same file is the one rule for which displayable definitions are a word's own: those whose `id` is the headword, homographs included, and those with no `id`. The two are compared by slug, so "ice-cream" is "ice cream"; the slug also drops the hyphen that marks an affix, and Merriam-Webster returns "the-" (god), "-an" and "-a-" with "the", "an" and "a", so an entry is the word's own only when it is an affix exactly when the word is ("-ness" keeps "-ness"). The rule needs no adapter: in the canonical contract `id` is the headword of the definition's entry whichever dictionary it came from, and an adapter whose partner has no such thing leaves it out (see Dictionary Adapters). It picks out the word's own entries first and applies displayability to them alone: the abbreviation half of that rule compares the entries of one headword, so, in a constructed example, the adjective "AC/DC" does not hide "AC", the only definition "ac" has. When none is the word's own ("indices" is stored under "index"), the first displayable definition stands in for it, so a word keeps one definition and its part of speech; the word page shows that definition without examples. The word page senses and the part-of-speech groups, browse pages and stat all read this rule, so a word is never listed under a part of speech its own page does not show. The related-words cell on a word page takes its part of speech from the first of those senses, so it names a group the word is in. The primary definition (`findValidDefinition`, `getWordDetails`) is the first of those own definitions, which is the first sense the page shows: the meta description, the RSS item, JSON-LD and the source link prefer the word's own entry over a compound listed first. If no own entry is displayable, the stand-in can itself be a compound. `primaryPartOfSpeech()` in `tools/utils.ts` reads it as well, so the WordNet relations fetched when a word is added follow the part of speech its page opens with. For an abbreviation-only word this yields `abbreviation`, which has no WordNet grammatical mapping, so relations are fetched without a part-of-speech focus. Add-time acceptance alone uses displayability without this rule: one displayable definition is enough, whichever entry it belongs to, because it can stand in.

### Rendering Definitions

A page never renders stored text as HTML, and never asks which adapter wrote a record. `toDefinitionSegments()` in `utils/definition-text.ts` turns a definition into runs of plain text and cross-references (`DefinitionSegment` in `types/word.ts`), with the whitespace around the whole dropped:

```typescript
toDefinitionSegments({
  text: 'A taxonomic order of arachnids.',
  references: [{ start: 12, end: 17, url: 'https://www.wordnik.com/words/order' }],
});
// [{ type: 'text', text: 'A taxonomic ' },
//  { type: 'reference', text: 'order', url: 'https://www.wordnik.com/words/order' },
//  { type: 'text', text: ' of arachnids.' }]
```

`WordSenses.astro` renders each text run as escaped text and each reference as an `<a>`; there is no `set:html`, so no stored or fetched text becomes markup. `getWordSenses()` builds the senses from it, and `findValidDefinition()` and `getWordDetails()` join the runs into the plain text that meta descriptions, JSON-LD and the RSS feed use. JSON-LD cannot go through Astro's escaping without corrupting it, so `StructuredData.astro` writes it with `serializeJsonLd()` (`utils/text-utils.ts`), which writes every `<` as `\u003c`: definition text holding `</script>` cannot close the element.

A definition's text and optional `references` are used as stored; references that do not fit the text fail the build. Legacy partner markup is accepted only by the offline normalizer, not interpreted while pages render.

## Dictionary Adapters

An adapter (`adapters/`) translates its partner dictionary's response into one canonical contract and does nothing else. Retries, the case of the query, the fallback chain and input handling belong to the callers (`fetchWithFallback()` and the CLI tools).

### Canonical Contract

`fetchWordData(word)` returns a `DictionaryResponse` (`types/adapters.ts`):

| Field | Rule |
|---|---|
| `word` | Exactly the word requested |
| `definitions` | At least one `DictionaryDefinition` |
| `meta` | `source` nonblank; `attribution` nonblank and `url` absolute http(s) when present |
| `headword` | Omitted, or at least one of `pronunciation` and `etymology` (nonblank) and `audio` (absolute http(s) URL) |

Each `DictionaryDefinition` (`types/common.ts`):

| Field | Rule |
|---|---|
| `text` | Required: one nonblank string of plain text, never an array of fragments; adapters translate partner markup before returning it |
| `references` | The cross-references in `text`: a nonempty list of `{ start, end, url }` (JavaScript string offsets, `end` exclusive), in order, not overlapping, each over nonblank text, `url` absolute http(s) |
| `partOfSpeech` | A value of the vocabulary in `constants/parts-of-speech.ts` |
| `label` | The partner's raw term when it maps to no part of speech; never beside `partOfSpeech` |
| `id` | The headword of the dictionary entry the definition belongs to, without a homograph number; nonblank when present, and omitted when the partner names no entry. Never a partner's own identifier for a sense or a record |
| `attributionText`, `sourceDictionary` | Nonblank when present |
| `sourceUrl` | Absolute http(s) URL when present |
| `examples`, `synonyms`, `antonyms` | Nonempty lists of nonblank strings when present |

No other key is allowed, and a field with no value is omitted rather than stored as `""` or `[]`. A definition with neither `partOfSpeech` nor `label` is one the partner did not classify. A `label` is not a part of speech: a definition carrying only a label is not displayable and is never grouped under a part of speech.

`id` is the field a page reads to tell a word's own definitions from another entry's (see Displayable Definitions), so it means the same from every adapter. Merriam-Webster's is `meta.id` without the homograph number: its API documents that member as the headword and, in a homograph entry, an appended colon and number. Wiktionary's endpoint answers for one page, the word's, and names no other entry, so its adapter sets none. (Records stored from Wordnik, whose adapter is gone, could hold an identifier of Wordnik's own there, `C5067000-1`; the normalizer removes it.) A definition with no `id` is the word's own.

A partner's formatting is the adapter's to translate. Wiktionary's endpoint sends HTML: `htmlToText()` (`adapters/wiktionary.ts`) drops comments, and `<script>` and `<style>` elements with their content, reads a line break or the end of a block as a space, drops every other tag and keeps its content, and only then decodes character references with the `entities` package, so what a reference decodes to is never read as markup; it removes directional marks (U+200E and its kin) and collapses whitespace. Its links to other entries are dropped with the rest, not kept as `references`: it links nearly every content word of a definition, and Merriam-Webster's cross-references are plain words too. The endpoint also lists a page's footnotes among the definitions ("pneumonoultramicroscopicsilicovolcanoconiosis" has one, on its pronunciation); the adapter leaves out any item carrying the Cite extension's `mw-reference-text` class. It also sends, inside a sense, Wiktionary's note that the entry is a [translation hub](https://en.wiktionary.org/wiki/Appendix:Glossary#translation_hub), a term kept so that other languages' words have an English entry to be translations of: "apple juice" read "The juice of apples. (This entry is a translation hub.)". The note is about the page, so the adapter removes it: the span that links that glossary entry and holds no span of its own, found by the link and not by its `use-with-mention` class, which a whole sense can carry ("older brother"). An item that is the note and nothing else is left out as a footnote is, so an entry with no other sense ("bake bread") answers with no definitions and is a word not found, not the unexpected shape a page of blank definitions would be. Of 14 entries sampled from the 293 in Category:English translation hubs on 12 October 2026, all carried the note in that one form and 5 had nothing else; a note Wiktionary words or marks up differently is not recognised and stays in the text. It reads the `en` key only, which holds the page's English section and, before it, its Translingual one; each usage names its section in `language`. The English section is the word: the Translingual one is read only when the page has no English section (a taxonomic name such as "Amblypygi"), since read first it would give "three" a NATO code word and "Paris" a genus of plants as their primary definition. A page with no `en` key is a word not found. A sense that has subsenses arrives with them nested in its HTML and listed again after it, so its own text ends where the nested list opens and each subsense is kept once, as its own definition; such a sense takes no examples, which the endpoint sends mixed with its subsenses'. Page titles are case-sensitive (`Amblypygi` exists, `amblypygi` does not), and the adapter looks up exactly what it is given: case is the caller's (`--preserve-case`). A title that is a redirect page is answered with its target's definitions and a plain 200 (observed on 12 October 2026 for "can't be arsed", which redirects to "arsed"; the specification's 302 and its `redirect` parameter made no difference), so the adapter cannot tell and returns them under the word asked for, with a source link that the wiki redirects in turn. `parseDefinitionMarkup()` (`utils/definition-text.ts`) is legacy: it reads the markup Wordnik put in its text (`<xref>word</xref>`, `<internalXref urlencoded="target">label</internalXref>`) for the offline normalizer only. Merriam-Webster's cross-reference tokens (`{sx|...}`, `{a_link|...}`, `{d_link|...}`, `{dxt|...}`) appear only in its definition tree and example sentences, never in the `shortdef` a definition's text comes from, so `stripMarkup()` keeps them as plain words.

Each adapter's `POS_MAP` is written `satisfies Readonly<Record<string, BasePartOfSpeech>>`, so a mapping can only name a vocabulary value. `buildDefinition()` in `utils/adapter-utils.ts` classifies the partner's term (`classifyPartOfSpeech()`) and omits empty values; `buildDictionaryResponse()` does the same for the envelope and drops every definition whose text is blank, for all adapters, so one empty sense (a blank Merriam-Webster `shortdef`, an item Wiktionary sends empty) never gets the rest refused. When every definition in a nonempty list is blank it throws `throwUnexpectedShape()` instead: senses with no text in any of them mean the partner changed how it sends text (a renamed text field reads as none), not that it lacks the word.

Stored word files use the same `DictionaryDefinition` shape. `npm run tool:normalize-word-data -- --dry-run` previews the offline migration of a legacy corpus; without `--dry-run` it converts partner markup to structured references, maps known legacy parts of speech, omits empty fields, and drops the `id` of every definition in a record whose `adapter` is `wordnik`: the Wordnik adapter, since removed, stored Wordnik's own identifier there before the contract said what the field holds, and a page read it as another entry's headword, so the definition was missing from the word's page. Nothing in the value tells an identifier from a headword, so the migration goes by the record's `adapter`; pages still never read that field. It never calls a dictionary API or invents a label, and it stops without writing when any file is malformed.

### Enforcement

`isCanonicalResponse()` in `utils/adapter-utils.ts` checks every rule above, including the ones a type cannot express, except what `id` means: a headword and a partner's identifier are both nonblank strings, so each adapter's spec pins what it puts there (`tests/adapters/wiktionary.spec.ts` that Wiktionary's has none, `tests/adapters/merriam-webster.spec.ts` that the homograph number is stripped). `fetchWithFallback()` applies it once to every adapter's answer, before displayability. A response that breaks it is refused whole with an unexpected-shape error: the chain moves on, and the fault stays in the final `AggregateError`. The guard reads the text the adapter hands it, after the adapter's translation, and refuses any definition whose text still holds a complete HTML-shaped tag. That includes one that was only ever text at the partner: a Wiktionary definition holding `&lt;b&gt;critical&lt;/b&gt;` is decoded by `htmlToText()` to `<b>critical</b>`, which is tag-shaped, so the response is refused, the word comes from the next adapter in the chain and the Wiktionary fault is reported. This is intended: canonical text is plain, and the guard cannot tell text shaped like markup from markup an adapter failed to translate. When no other adapter in the chain has the word, it is not added. A bracket that is not a tag (`&lt;20 mg/dL`, decoded to `<20 mg/dL`) is text and is kept. `tests/adapters/fallback.spec.ts` pins both. An answer with no definitions at all is read first, as the partner not having the word rather than a changed API: a Merriam-Webster entry that is only a cross-reference (`ran`, past tense of `run`, has an empty `shortdef`) or a Wiktionary usage with an empty `definitions` list is a `WordNotFoundError`, so when every adapter says the same, add-word refuses the word at warn. Only a definition list the partner sent empty reaches that check empty. An answer that lists definitions but has nothing to keep is an unexpected shape before it gets there: `buildDictionaryResponse()` refuses a list whose every definition is blank (every Wiktionary `definition` empty), and the Merriam-Webster adapter refuses an answer none of whose entries has `shortdef`, which the API documents as a top-level member of the entry and nowhere marks optional.

`tests/adapters/contract.spec.ts` applies the same guard to fixtures. It enumerates the registry (`getAdapterNames()` in `adapters/index.ts`) and requires:

- a directory `tests/adapters/fixtures/<adapter name>/` for every registered adapter, and none for anything else
- at least one successful response in it: every `.json` file except `not-found.json`, which holds the partner's answer for a word it does not have
- that each successful response, fed through its adapter with `fetch` stubbed and the file name as the word, passes `isCanonicalResponse()` and has at least one displayable definition (`isValidDictionaryData()`): the guard alone accepts a response whose every definition carries only a label, which `fetchWithFallback()` would refuse

### Adding an Adapter

1. Write `adapters/<name>.ts` exporting a `DictionaryAdapter` (a `name` and `fetchWordData()`, nothing else) whose `name` is its registry key. Guard the partner's raw response with type guards; throw `WordNotFoundError` for a missing word, `RateLimitError` for a 429 (`throwOnHttpError()` does both) and `throwUnexpectedShape()` for a body it cannot read, such as one missing a field the partner documents on every entry (Merriam-Webster's `shortdef`). A readable answer whose definition list the partner sent empty needs no throw: pass it through and `fetchWithFallback()` reports it as not found. Pass every definition the partner listed to `buildDictionaryResponse()`, blank ones included: when every one is blank it throws as an unexpected shape, since a partner that lists definitions has the word.
2. Translate with `buildDefinition()` and `buildDictionaryResponse()`, mapping part-of-speech terms through a `POS_MAP` that `satisfies Readonly<Record<string, BasePartOfSpeech>>`. Pass plain text, never markup.
3. Register it in `ADAPTER_REGISTRY` in `adapters/index.ts`.
4. Add `tests/adapters/fixtures/<name>/` with at least one recorded response body, plus `not-found.json` if the partner answers a missing word with a body. A fixture built by hand rather than recorded says so in a README in the directory. The contract suite fails until the directory exists and every response in it comes out canonical, with a displayable definition.
5. Unit-test the adapter's own translation in `tests/adapters/<name>.spec.ts`.

## CLI Tools

All tools are pure Node.js (no Astro deps) and parse their arguments through `parseToolArgs` (`tools/help-utils.ts`), a `util.parseArgs()` wrapper: a command line it cannot parse, such as an unknown `--batchsize=5` or `--word` without its value, is refused with one warn-level line naming the problem and pointing to `--help`, and exit 1, instead of an uncaught stack trace.

Tools run directly on Node's built-in TypeScript support (`node tools/<tool>.ts`); there is no loader or compile step. `npm run tool:local <tool>` runs a tool through `node --env-file-if-exists=.env`, so `.env` is loaded when present and variables already in the environment win. When `.env` is absent Node prints `.env not found. Continuing without it.` to stderr and carries on. The bare `tool:*` scripts (`tool:generate-images`, `tool:regenerate-all-words`, ...) do not load `.env`: image tools render without the site title and the Merriam-Webster adapter throws without its key.

npm keeps any flag written before a bare `--` for itself, so a tool's flags always follow one: `npm run tool:local tools/add-word.ts -- --help` and `npm run tool:add-word -- --help` print the tool's help, and without the separator npm prints its own. `tests/architecture/npm-scripts.spec.ts` enforces this in `package.json`, tool help text, docs and workflows.

### `add-word.ts`

Adds a word with dictionary validation and duplicate detection. A word page's URL is `/word/<slug>/`, and `slugify()` keeps only ASCII letters, digits, underscores and hyphens, so add-word refuses a word whose slug is empty (`&`, `日本`: the page would be `/word/` itself) and a word whose slug a different stored word already has (`can't` beside `cant`: both would be `/word/cant/`). Only a new word is checked: the build and regenerate-all-words, which keeps each word's text, read stored words as they are. It does not render the social card: the Add Word workflow runs the complete image generation afterwards (see Image Generation).

A word is lowercased before it is looked up and stored, unless `--preserve-case` (the workflow's `preserve_case` box) is given. An entry a dictionary spells with a capital needs it: Wiktionary's titles are case-sensitive, so `Japan` or `Amblypygi` is found and `japan` or `amblypygi` is not, and without the flag such a word is reported as not found.

```sh
npm run tool:local tools/add-word.ts serendipity
npm run tool:local tools/add-word.ts ephemeral 20250130
npm run tool:local tools/add-word.ts -- Japan --preserve-case
npm run tool:local tools/add-word.ts -- serendipity --overwrite
```

Failures are classified by error type, never by message text. Adapters throw `WordNotFoundError` (from `utils/adapter-utils.ts`) for a 404, an empty answer, a Merriam-Webster suggestion list or an entry only in another Merriam-Webster dictionary, and `RateLimitError` for a 429; `fetchWithFallback()` throws it for a definition list the partner sent empty. A 200 whose body is not an array at all is an unexpected shape, not a missing word: the API changed. So is every other answer with no definition to keep (a field the adapter reads renamed, every definition blank) and an answer that breaks the canonical contract (see Dictionary Adapters). A canonical answer none of whose definitions has a part of speech from the vocabulary (Wiktionary's "etc." is a Phrase, "pre-" a Prefix, "%" a Symbol; the term is kept as each definition's `label`) is a `NoDisplayableDefinitionError`, which names the terms: the dictionary has the word and nothing is at fault, so add-word refuses it at warn ("Word has no definition the site can display") when every other adapter said not found (`isNotDisplayable`). add-word reports "Word not found in dictionary" only when every adapter in the chain threw `WordNotFoundError` (`isWordNotFound`); a rate limit, outage or unexpected shape anywhere in the chain is reported as a failure to add. regenerate-all-words backs off when any adapter threw `RateLimitError` (`isRateLimited`).

### `generate-images.ts`

Consolidated image generation (SVG templates, Sharp PNG conversion, 1200x630px OpenGraph).

```sh
npm run tool:local tools/generate-images.ts                         # All images
npm run tool:local tools/generate-images.ts -- --word japan         # Single word
npm run tool:local tools/generate-images.ts -- --words              # All word images
npm run tool:local tools/generate-images.ts -- --generic            # Generic page images
npm run tool:local tools/generate-images.ts -- --page /stats        # Specific page
npm run tool:local tools/generate-images.ts -- --force              # Regenerate existing
```

A bulk run reads the corpus once. A word file that cannot be read, or is not valid word data, is logged and counted as a failure: its card and the pages it feeds would be missing, so the run exits 1 and does not certify the image cache. `--word` logs such a file and still draws the card of a word it finds; when it finds none and part of the data could not be read, it exits 1 without calling the word missing, since the word may be in what could not be read. `--page` draws nothing and exits 1, since a page title can depend on the corpus.

### `regenerate-all-words.ts`

Batch refresh of word data from the dictionary API. Supports dry-run mode and rate limiting. A word file it cannot read (not JSON, or no `word` string) counts as a failure, in a dry run too, so the exit code says whether every stored word was covered. Run without `--force` or `--dry-run` it only asks for `--force` and exits 0, unless the words directory is missing or a file in it cannot be read: that exits 1 before the confirmation, which would otherwise count only the words it could see. `--force` re-sources every word through the configured adapter chain (the `adapter` field follows); pronunciation audio and etymology come only from Merriam-Webster, so run it via `tool:local` with `MERRIAM_WEBSTER_API_KEY` in `.env` to backfill them. A refresh never changes which dictionary a record is from: the fallback answers whenever the primary fails for any reason (a rate limit, an outage, a timeout), so when the adapter that answers is not the one the record stores, the record is kept as it was and the word counts as a failure. A word written by hand (`adapter: "manual"`) is never looked up: it is skipped, counted as `skipped` in the summary, and is not a failure, so a run whose only non-successes are skips exits 0; `--adapter manual` is refused at warn, exit 1, since there is no dictionary to re-source it from. `--adapter <name>` is how a record changes dictionary: it limits the run, and its dry run, to the records whose stored `adapter` is `<name>`, compared as written, and lets each be answered by whichever adapter in the chain has it. The name need not be an adapter this version still has, which is how a site replaces the words a removed dictionary supplied (Dictionary Credit, below). A name no record stores (`Merriam-Webster`, a mistyped one, or one a finished re-source left none of) is refused at warn with the stored adapters listed, exit 1, in a dry run too. A word keeps its date, its case and `preserveCase`. Stored enrichment is carried over only when the dictionary that answers is the one that wrote the record, so a pronunciation one dictionary supplied is never kept under another's name; WordNet relations are looked up again either way. A word no adapter in the chain has keeps its file untouched and makes the run exit 1.

## Dictionary Credit

What each dictionary asks of a site that shows its definitions, and how the site answers. Quotations are from the pages named, read on 12 October 2026.

| Source | What it asks | Where the site does it |
|---|---|---|
| Merriam-Webster | "All applications using the Merriam-Webster API must feature the Merriam-Webster logo." "You are not allowed to edit or modify the Merriam-Webster logo." Approved sizes 50, 100 and 125 px; "keep the \"®\" (registration symbol) visible and on the bottom/right of the logo". "Merriam-Webster product titles should be written out in full", with "a superscript registration symbol directly after" Collegiate ([brand guidelines](https://dictionaryapi.com/info/branding-guidelines)) | The Attributions page (`/attributions/`, linked from every footer) shows `src/assets/merriam-webster-logo.png`, the file the guidelines page offers for light backgrounds, byte for byte (`tests/architecture/dictionary-logo.spec.ts` pins its hash), at 50 px on a white plate, and names each product by its title from the [product list](https://dictionaryapi.com/products/index) |
| Wiktionary | Text is CC BY-SA 4.0 ([Wiktionary:Copyrights](https://en.wiktionary.org/wiki/Wiktionary:Copyrights)). A reuser attributes "through hyperlink (where possible) or URL to the page or pages that you are reusing", agrees "to clearly indicate that the original work has been modified", and includes "a licensing notice stating which license the work is released under, along with either a hyperlink or URL to the text of the license" ([Terms of Use](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use), section 7) | Each word page: the Source link is the entry's page (for a word fetched from Wiktionary; a Wiktionary sense stored through Wordnik links to Wordnik until the site re-sources it), and on the sense's slide the stored `attributionText` ("Adapted from Wiktionary (CC BY-SA 4.0)") links the licence. The Attributions page credits Wiktionary, links the licence, says what was changed and that the result is under the same licence. The credit is decided for each sense from its own stored fields, so a record that mixes sources credits only its Wiktionary senses |
| A word written by hand (`adapter: "manual"`) | Nothing | Nothing |

Only Wiktionary needs a credit on the word page itself, because its licence attaches to every copy; Merriam-Webster asks for its logo on the application, so its `attributionText` is stored and not shown. The Attributions page credits only the dictionaries the site's own records came from: `getDictionaryCredits()` (`utils/attribution-utils.ts`) reads each record's `adapter` and each definition's `sourceDictionary`, and `getDefinitionLicense()` decides the word-page credit from `sourceDictionary` alone. No greyscale logo is supplied (the guidelines allow one, and offer only the two colour files and their `.ai` sources), so the colour file is shown as it is; a CSS filter would be an edit.

Not verified, and the owner's to judge: whether the feed, meta descriptions and JSON-LD, which carry a Wiktionary definition's text with no licence line of their own and rely on the link to the word's page, satisfy the licence (CC BY-SA 4.0 section 3(a)(2) allows "a URI or hyperlink to a resource that includes the required information"); whether a logo on a dedicated page, one link from every page, is what "feature" means; whether showing the 240 px file at 50 px is using an approved size; and Merriam-Webster's terms themselves, which license "non-commercial" use up to "1000/day/reference work" and at most "two reference works", and forbid "any automated or recorded queries" without written approval ([terms of service](https://dictionaryapi.com/info/terms-of-service)). The REST API's own description still names CC BY-SA 3.0 for content it serves; Wiktionary's copyright page and the Terms of Use, which name 4.0, are what the site follows.

**Wordnik is gone.** Its API terms forbid a licensee to "cache, record, pre-fetch or otherwise make or store local copies of the Wordnik content or Wordnik Data", allowing only "session-based caching" for display ([terms](https://developer.wordnik.com/terms)); every site stores what it fetches, so there is no adapter, key or setting for it. Wiktionary is asked directly at Wikimedia's definition endpoint (`/page/definition/{term}`, marked "Stability: stable" and "Experimental" in its [specification](https://en.wiktionary.org/api/rest_v1/)), which asks clients to stay under 200 requests a second and to "set a unique `User-Agent` or `Api-User-Agent` header that allows us to contact you quickly"; the adapter sends the project's name and repository URL.

A site that still stores Wordnik records re-sources them once, after syncing:

```sh
# tool:local reads the site's .env (DICTIONARY_ADAPTER, MERRIAM_WEBSTER_API_KEY); without one, set them on the command line
npm run tool:local tools/regenerate-all-words.ts -- --adapter wordnik --dry-run   # lists them, looks nothing up
npm run tool:local tools/regenerate-all-words.ts -- --adapter wordnik --force     # replaces each from the configured chain
npm run tool:local tools/generate-images.ts                                       # optional: see below
```

The last step is only for seeing the result locally. Site Deploy runs the complete image generation before it builds, so the Attributions page's card, which a site does not have until then, is drawn on the next deploy either way; the cards under `public/images/` are committed only by Add Word. Commit nothing it draws unless `git status` shows only the cards you expect: under a `.env` whose title or colors are not the repository's, it redraws every stored card (Image Generation, A site's cards and its `.env`).

With `DICTIONARY_ADAPTER=merriam-webster` and the default fallback, each word is asked of Merriam-Webster and, when it has none, of Wiktionary; with `DICTIONARY_ADAPTER=wiktionary DICTIONARY_FALLBACK=none`, of Wiktionary alone. Nothing else is contacted: WordNet relations are a local lookup.

It exits 1 and leaves the record as it was for any word the chain does not have. Wiktionary titles are exact, case included, so a word is found only under the spelling and case its record stores (`Amblypygi` with `preserveCase`, never `amblypygi`). Run on copies of both sites' words on 12 October 2026, with Wiktionary alone, it replaced all thirteen. Until a site has no record whose `adapter` is `wordnik`, these stay, and can be removed after: the Wordnik entry of `getDictionaryCredits()` and its section of the Attributions page; `parseDefinitionMarkup()` and the legacy-markup and sense-ID branches of `utils/word-data-normalizer.ts`; and `references` (the field, its guard in `utils/reference-utils.ts`, `buildDefinition()`'s parameter and the reference runs `WordSenses.astro` renders), which no adapter writes any more.

## URL System

Two-tier system supporting root and subdirectory deployments:

| Function | Purpose | Example (`BASE_PATH="/blog"`) |
|----------|---------|-------------------------------|
| `getUrl(route)` | Relative URL with BASE_PATH | `getUrl('/word/hello')` -> `/blog/word/hello/` |
| `getFullUrl(route)` | Absolute URL for SEO | `getFullUrl('/word/hello')` -> `https://example.com/blog/word/hello/` |

`getFullUrl()` uses `getUrl()` internally to ensure BASE_PATH consistency.

Both take a route, or a file path, from the site root, and always add the base path (`joinBasePath()` in `utils/url-utils.ts`). Neither takes a pathname that already has it. A route can begin with the base path's own segment, so no path can be tested for already being under the base: with `BASE_PATH=/word` the word page `/word/calm` is served at `/word/word/calm/`, and with `BASE_PATH=/stats` the stats index `/stats` is served at `/stats/stats/`. Through 3.27.0 `getUrl()` returned a path that began with the base path unchanged, so under either of those base paths every URL of that section lost the base path (internal links, JSON-LD breadcrumb URLs, `llms.txt` entries and, under `/word`, the feed's item links): it named a page that does not exist or, for the section's index, the home page. The one pathname that does carry the base is `Astro.url.pathname`; it is read back to its route before it is used (Trailing Slashes, below).

`SITE_URL` is the origin alone; a subdirectory belongs in `BASE_PATH` (Astro's [GitHub Pages guide](https://docs.astro.build/en/guides/deploy/github/) sets `site` and `base` the same way). URLs are resolved against the origin, so a `SITE_URL` that repeats the base path does not double it.

### Trailing Slashes

A page URL ends in a slash and a file URL does not: `/blog/`, `/blog/stats/` and `/blog/word/hello/`, but `/blog/rss.xml`, `/blog/words.json` and every image. `astro.config.ts` sets `build.format: 'directory'`, which writes each page as `stats/index.html`, with `trailingSlash: 'always'`. That is the pair Astro's [`build.format` reference](https://docs.astro.build/en/reference/configuration-reference/#buildformat) gives: "`directory` - Set `trailingSlash: 'always'`". A static host serves a directory's `index.html` at the slash URL, so the URL a page prints is the URL it is served at, with no redirect (the 404 page, below, has no URL and prints none).

Code names a route without the slash, and the helpers turn it into the URL:

- **A route is `/stats` or `/word/hello`.** `BASE_PATHS`, `ROUTES` and `URL_PATTERNS` in `constants/urls.ts`, the page metadata keys and the social card names are all keyed that way. Pass a route to `getUrl()`, `getFullUrl()` or `SiteLink`; do not write a URL by hand.
- **`getUrl()` is the one place a route becomes a URL.** `withTrailingSlash()` in `utils/url-utils.ts` adds the slash unless the last segment has an extension (`FILE_PATH_PATTERN` in `constants/urls.ts`), the line Astro's dev server draws between a file and a page under `'always'` (`hasFileExtension` in `@astrojs/internal-helpers`; the two patterns are not the same text, but agree on every path that starts with a slash). No route has a dot in it: `slugify()` drops them. The slash goes on the path, so a query string or fragment stays behind it (`getUrl('/stats#top')` is `/blog/stats/#top`); no caller passes one today. The canonical link, `og:url`, the JSON-LD `WebSite` and breadcrumb URLs, every internal link (`SiteLink`, the word chips, the heatmap, the word graph), the header search results and the random-word button (client scripts that import the same helper), `llms.txt`, the feed's channel and item links, the sitemap line in `robots.txt` and the manifest `start_url` and `scope` all come from these two helpers, so they agree. The sitemap is written by `@astrojs/sitemap`, which reads the same two settings and ends every `<loc>` in a slash.
- **`Astro.url.pathname` ends in a slash** (`/blog/stats/`), in a build and in the dev server: "`directory` - The `Astro.url.pathname` will include a trailing slash to mimic folder behavior" (same reference, [Effect on Astro.url](https://docs.astro.build/en/reference/configuration-reference/#effect-on-astrourl)). It also carries the base path. `getPathname()` and `stripBasePath()` read it back to the route, and `getPageMetadata()` and `getSocialImageUrl()` go through them; the layout builds the canonical link and `og:url` as `getFullUrl(stripBasePath(Astro.url.pathname))`. Read the pathname through those: a raw comparison (`Astro.url.pathname === '/stats'`) is never true, and `getUrl()` would add the base path to it a second time.

The manifest scope needs the root's slash for a second reason: a scope is matched as a string prefix, so `/blog` would also claim `/blogroll`.

**The slashless form** (`/stats`) is the host's to answer: "Trailing slashes on prerendered pages are handled by the hosting platform, and may not respect your chosen configuration" ([`trailingSlash`](https://docs.astro.build/en/reference/configuration-reference/#trailingslash)).

| Server | `/stats/` | `/stats` |
|--------|-----------|----------|
| GitHub Pages | 200 | 301 to `/stats/` |
| `python3 -m http.server` in `dist/` | 200 | 301 to `/stats/` |
| `astro preview` | 200 | 404, Astro's own page: `Not Found (trailingSlash is set to "always")` |
| `astro dev` | 200 | 404, Astro's own page, which names the setting and links `/stats/` |

Through 3.26 the site linked the slashless form everywhere (`trailingSlash: 'never'` with the same `directory` output), so canonical URLs, sitemap entries and internal links each cost that redirect on GitHub Pages. Links published then keep working there, through the same redirect. The GitHub Pages row was read from the deployed 3.26 demo site, which has the same file layout; the other rows from this build. A host that answers `/stats` with neither the page nor a redirect would break those older links, and none has been tested beyond these four.

**Files.** An endpoint with an extension (`rss.xml`, `words.json`, `manifest.json`, `robots.txt`, `llms.txt`, `humans.txt`, `health.txt`, `theme.css`, `ga-init.js`) is built as that file and matched without a slash in the dev server and the preview as well. The home page is `index.html` and its URL is the root, `/` or `/blog/`.

**The 404 page** is the one page that is not a directory: Astro writes `404.html` at the root, and the host sends that file for every URL it has nothing else for. So the page has no URL of its own, and its head names none: no canonical link, no `og:url` and no breadcrumb trail in JSON-LD. `src/pages/404.astro` sets `errorPage` on `Layout` for that, next to `noindex`; the breadcrumb the reader sees, the social image and the `WebSite` JSON-LD stay. Its route is still `/404`, and through 3.27.0 all three named `/404/`, a URL that is itself an error: GitHub Pages serves the file with a 200 at `/404` and `/404.html` and with a 404 at every missing path, `/404/` among them (read from the deployed demo site). The grounds:

- A canonical link gives "the preferred URL for the current document" ([HTML Standard, link type "canonical"](https://html.spec.whatwg.org/multipage/links.html#link-type-canonical)). Its target "MUST identify content that is either duplicative or a superset of the content at the context (referring) IRI", and an author is to avoid a target that is "An IRI that returns an error code, such as a 4xx response in HTTP" ([RFC 6596, section 3](https://www.rfc-editor.org/rfc/rfc6596.html#section-3)). `/404/` is such a target, and no other URL is the preferred one for a page shown in place of one that does not exist.
- Google takes nothing from the page where it is an error: "Any content Google receives from URLs that return a `4xx` status code is ignored" ([How HTTP status codes affect Google's crawlers](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes#4xx-client-errors)). At the two URLs that answer 200 the page is `noindex`. Other crawlers were not checked.
- `og:url` is "The canonical URL of your object that will be used as its permanent ID in the graph", and the protocol lists it among "The four required properties for every page" ([Open Graph protocol, Basic Metadata](https://ogp.me/#metadata)). Leaving it out departs from that list on purpose: the page has no permanent URL, and the one it gave was wrong. What a consumer does with a page that has no `og:url` was not tested.

**Feed item identity.** A reader keys a feed item by its `<guid>`. `@astrojs/rss` writes the guid from the item's `<link>` and its item schema has no guid field, so when the links gained the slash in 3.27.0 the guids would have changed with them and a reader would have shown every item in the feed as new. `src/pages/rss.xml.ts` therefore passes each item a `<guid>` through `customData` holding the slashless URL the item had before. That replaces the generated guid only because of how the package merges the field (`Object.assign` in its `generateRSS`), which its README does not state, so `tests/src/pages/rss.spec.ts` pins the result: one guid per item, the slashless URL. The guid is still a permalink: a host answers it with a redirect to the page. In 3.28, a site with `BASE_PATH=/word` has a one-time guid change because the corrected URL helper restores the base segment that its old, broken item URLs omitted.

### Route Structure

```
/                            # Homepage (current word)
/word/                       # All words
/word/{word}/                # Individual word pages
/browse/                     # Browse hub
/browse/year/                # Words by year index
/browse/{year}/              # Words by year
/browse/{year}/{month}/      # Words by month
/browse/letter/              # Words by starting letter index
/browse/letter/{letter}/     # Words by starting letter
/browse/length/              # Words by length index
/browse/length/{n}/          # Words by length
/browse/part-of-speech/      # Words by part of speech index
/browse/part-of-speech/{p}/  # Words by part of speech
/stats/                      # Statistics hub
/stats/{category}/           # Individual stat pages
```

## Sentry Integration

### Sentry SDKs

Three Sentry contexts, each with its own SDK:

| Context | SDK | Config | Purpose |
|---------|-----|--------|---------|
| Browser | `@sentry/astro` | `sentry.client.config.js` | Tracing, error-only session replays |
| Server | `@sentry/astro` | `sentry.server.config.js` | Tracing disabled (static site) |
| CLI | `@sentry/node` | Lazy init in `utils/logger.ts` | Only initializes on first error |

The `sentry()` integration in `astro.config.ts` takes build-time options only (`org`, `project`, `authToken`, read from `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, with `sourcemaps` and `telemetry` under Source Maps and Build Telemetry below); runtime options live in the two config files. The release the build injects and uploads source maps under is `SENTRY_RELEASE`, which `astro.config.ts` sets to the same string as `__RELEASE__` when the environment does not.

### Source Maps

A Sentry-enabled build makes source maps for Sentry to read and attempts to delete them before the site is deployed. The config leaves `vite.build.sourcemap` unset, so the integration sets it to `'hidden'`: the client build writes `.js.map` files beside its chunks in `dist/_astro/`, and no chunk carries a `sourceMappingURL` comment. What ties a chunk to its uploaded map is the debug ID the plugin writes into the chunk (`sentry-dbid-<uuid>`), which stays in the deployed JavaScript.

`astro.config.ts` supplies `sourcemaps.filesToDeleteAfterUpload` with a shared array populated in `astro:config:done` with an absolute glob for `<outDir>/<build.assets>/**/*.js.map` (normally `dist/_astro/`). It has to be set: the SDK's own default is `./dist/**/client/**/*.map` and `./dist/**/server/**/*.map`, the layout an adapter produces, which matches nothing in a static build, so every deploy served the maps at `/_astro/<chunk>.js.map` (the largest about 1.7 MB). The glob follows Astro's resolved `outDir`, including `--outDir`, and only targets JavaScript maps in the generated-assets directory; unrelated `.map` files copied from `public/` are preserved. The option sits under `sourcemaps` in the integration's options (`@sentry/astro` in the SDK's [migration guide](https://github.com/getsentry/sentry-javascript/blob/11.6.0/MIGRATION.md)); Sentry's [Vite guide](https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite/) lists deletion as one way to keep generated maps from being public.

Deletion does not wait for a successful upload. The plugin deletes in the `finally` of its `writeBundle` hook, after that build's upload call has returned, so deletion is attempted whether the upload succeeded, was skipped (Sentry enabled with no `SENTRY_AUTH_TOKEN`) or failed. Deletion is best-effort: a filesystem failure can leave maps in the output. A failed release or upload is logged (`[sentry-vite-plugin] Error: An error occurred. Couldn't finish all operations`) and does not fail the build: if deletion succeeds, that deploy has its maps in neither place, and its stack traces stay minified in Sentry.

Validation: a tokenless local build with a custom `--outDir` captured seven generated JavaScript maps before cleanup and confirmed all seven were deleted. Two unrelated public maps (`.map` and `.js.map`) and a sentinel in the existing `dist/` were preserved. The SDK endpoint was a closed local port and telemetry was disabled. A successful upload followed by deletion remains unverified. Check after deployment: `/_astro/<chunk>.js.map` returns 404 on the live site and a new error in Sentry still shows original source.

### Build Telemetry

`telemetry: false` in the same options turns off what the build plugin reports about itself. The integration passes `telemetry ?? true` to the Vite plugin, so left unset, a build aimed at sentry.io sends a Sentry-owned project a session and sampled `Sentry Bundler Plugin execution` transactions, tagged with the org and project slugs, the Node version, the platform and which plugin options are set, and prints ``[sentry-vite-plugin] Info: Sending telemetry data on issues and performance to Sentry. To disable telemetry, set `options.telemetry` to `false`.`` once per Vite build. With the option off the line is gone and the plugin sends nothing. Sentry's [Astro source maps guide](https://docs.sentry.io/platforms/javascript/guides/astro/sourcemaps/) names the option: "You can disable telemetry collection by setting `telemetry: false` in the `sentry` integration options."

The option stops at the plugin. To create the release and upload the maps the plugin calls the Sentry CLI (the `sentry` package, a dependency of `@sentry/bundler-plugins`), which reports about itself to a second Sentry-owned project unless `SENTRY_CLI_NO_TELEMETRY=1` or `DO_NOT_TRACK=1` is in the build's environment. `astro.config.ts` therefore sets `SENTRY_CLI_NO_TELEMETRY` to `1` when the environment has not set it or has left it blank, next to the `SENTRY_RELEASE` default, so every build of every site has it without a workflow change.

### Pinned Defaults

SDK 11 collects more than SDK 10 unless told otherwise, so every default it changed is set explicitly, apart from user timing spans (under the table), where it collects less. `utils/sentry-options.ts` is the one definition; `sentry.config.shared.js` and `utils/logger.ts` spread it into each `init`. Sources: the SDK's [migration guide](https://github.com/getsentry/sentry-javascript/blob/11.6.0/MIGRATION.md) and [changelog](https://github.com/getsentry/sentry-javascript/blob/11.6.0/CHANGELOG.md).

| Option | Pinned value | SDK 11 default | Where |
|--------|--------------|----------------|-------|
| `dataCollection.userInfo` | `false` | `true`: Sentry infers the visitor's IP address | all |
| `dataCollection.cookies`, `httpBodies` | `false`, `[]` | collected | all |
| `dataCollection.httpHeaders`, `urlQueryParams` | deny `forwarded`, `-ip`, `remote-`, `via`, `-user` | everything | all |
| `dataCollection.genAI`, `graphQL`, `databaseQueryData`, `queues` | off | on | all |
| `dataCollection.frameContextLines` | `7` | `5` | all |
| `attachStacktrace` | `false` | `true` | all |
| `traceLifecycle` | `'static'` (transactions) | `'stream'` | all |
| `Dedupe` integration | removed (`withoutDedupe`) | added to the Node defaults in 11.2 | server, CLI |
| `browserSessionIntegration` `lifecycle` | `'route'` | `'page'` | browser |
| `browserTracingIntegration` `instrumentBfcacheRestore` | `false` | `true`: a navigation span per back/forward-cache restore | browser |
| `browserTracingIntegration` `webVitals` | `softNavigations: false`, `bfcacheNavigations: false` | both `true` (span streaming only) | browser |

`traceLifecycle: 'static'` is a compatibility mode the SDK plans to remove in a later major; moving to span streaming then is a behaviour change (the `site` scope tag does not reach streamed spans) and needs its own decision.

`Dedupe` sends nothing more; it is removed for what it would lose. It drops an event that repeats the one before it, comparing the message, fingerprint and stack trace but not the context. The logger sends the message as the event and what differs as context, so a tool that fails on three words in a row (`'Failed to process word'` in `tools/regenerate-all-words.ts`) would report the first only.

One changed default is left as SDK 11 has it: `browserTracingIntegration` no longer turns `performance.mark()` and `performance.measure()` entries into spans, and `userTimingIntegration`, which the migration guide gives to keep them, is not added. No script the build emits makes a mark or a measure, so the integration could only send the names and `detail` of entries made by third-party scripts and browser extensions.

Session Replay is error-only (`replaysOnErrorSampleRate: 1`, `replaysSessionSampleRate: 0`). What a replay may show is `sentryReplayPrivacy` in the same file, a privacy choice and not an SDK 10 pin: page text and media are unmasked (`maskAllText: false`, `blockAllMedia: false`), since the content is public, and input values are masked (`maskAllInputs: true`, which is also the SDK's default; see [Replay privacy](https://docs.sentry.io/platforms/javascript/guides/astro/session-replay/privacy/)). The header search box is the only input, so a replay of a session that hit an error shows one `*` for each character typed there, not the characters. The results listed under the box are page text and stay readable: a replay still shows which words matched.

Not configurable in SDK 11, so different from SDK 10: a browser session with an uncaught error is recorded as `unhandled`, not `crashed`; span operations, names and attributes follow the new conventions (`browser.DNS` is `browser.dns`, `paint` is `browser.paint`, `sentry.source` is `sentry.segment.name.source`); the SDK no longer makes its own `sentry-tracing-init` mark, so the pageload transaction has one span fewer; the CLI's outgoing requests, which already carried `sentry-trace` and `baggage` headers, now state the not-sampled decision in them (`sentry-trace` ends in `-0`, `baggage` gains `sentry-sampled=false`).

### Logger Architecture

All loggers share a factory in `utils/logger-core.ts` that creates a `Proxy` over `console`. The factory accepts a `SentryBridge` interface and an optional output filter. Each environment provides its own bridge (wiring to the correct SDK) and filter.

```
utils/logger-core.ts          Core factory: createLogger(options)
                               - Console proxy with Sentry forwarding
                               - SentryBridge interface (withScope, captureException, captureMessage)
                               - shouldOutput filter for log level control

utils/logger.ts                CLI wrapper: @sentry/node
                               - Lazy Sentry init (first error only)
                               - All log levels always output
                               - exit(), flush(), getErrorMessage() helpers

src/utils/logger.ts            Astro wrapper: @sentry/astro
                               - Sentry already initialized by Astro integration
                               - Prod: only warn/error output
                               - config export (isDev, sentryEnabled, version)
```

The `isLogContext` type guard from `#types` validates the context argument before `Object.entries()` iteration. This prevents iterating over string characters or Error instance properties.

**The `exit()` helper**: Always use `await exit(code)` instead of `process.exit()` in error handlers. `process.exit()` kills in-flight async work immediately, losing pending Sentry events. `exit()` flushes first.

**Error level means fault**: only `logger.error` creates a Sentry event (`captureException` for an `Error`, otherwise `captureMessage` at level `error`); `warn`, `info` and `debug` only print. So CLI tools refuse operator input at `warn`: add-word's blank word, word with no URL slug or with the slug of a different stored word, malformed or future date, date or word already taken, and a word every adapter in the chain reported as not found; generate-images' `--word` that is not in the data and `--page` that is not a page; regenerate-all-words' malformed `--timeout`, `--batch-size` or `--batch-timeout`; and a command line any of them cannot parse all exit 1 with a warn-level message. Network failures, HTTP errors, unexpected response shapes, rate limits, unreadable word files and missing configuration log at `error`. A words directory that is missing or holds no word file (no year directory, or year directories with no word file in them, which a failed first add-word leaves since it makes the year directory before fetching) is not a fault to add-word's duplicate check, since a new site's first word has nothing to collide with, but generate-images (its `--word` and `--page` runs included) and regenerate-all-words, which need data, fail on it at `error`.

## Statistics System

All statistics computed at build time from `allWords`:

- **Letter patterns**: Palindromes, double/triple letters, alphabetical sequences, same start/end
- **All consonants**: a word with at least one consonant and no vowel (a, e, i, o, u). Only a vowel disqualifies it, so punctuation does not: `pb&j` and `tsk-tsk` count, and `42`, which has no consonant, does not
- **Word endings**: Common suffixes (-ed, -ing, -ly, -ness, -ful, -less)
- **Letter analysis**: Most/least common letters (ranked by the number of words containing the letter, case-insensitive, not by total occurrences; `getLetterStats` is the single definition for the stat, its page, and its metadata), vowel/consonant ratios
- **Streaks**: Current and longest consecutive word streaks
- **Milestones**: 1st, 25th, 50th, 100th words, etc.
- **Parts of speech**: the number of words under each part of speech, most words first (`getPartOfSpeechStats`), as a section on `/stats` and on `/stats/parts-of-speech`. A count is the size of that part of speech's group in `groupWordsByPartOfSpeech`, so it is the number of words `/browse/part-of-speech/{p}` lists, the page the count links to. A word whose own definitions (see Displayable Definitions) span several parts of speech is counted under each, so the counts can add up to more than the number of words. A part of speech no word has is not listed, as it has no browse page

Definitions live in `constants/stats.ts`. Computation functions in `utils/word-stats-utils.ts` (pure) and `src/utils/word-stats-utils.ts` (Astro wrapper). All stat pages are always generated — if a stat has zero results, the page renders with a zero count. Demo word coverage should be expanded if stats pages need test data rather than adding feature flags to skip pages.

## Image Generation

- **Templates**: Programmatic SVG with OpenType.js text measurement
- **Conversion**: Sharp PNG rasterization (1200x630px, 90% quality, 128-color palette)
- **Typography**: Liberation Sans Regular + Bold (`tools/fonts/liberation-sans/`), gradient text with theme colors
- **Settings**: `createSvg` draws the card text and `SITE_TITLE` on one line each, so any run of whitespace, line breaks included, becomes one space and the ends are trimmed. The gradient takes `COLOR_PRIMARY`, `COLOR_PRIMARY_LIGHT` and `COLOR_PRIMARY_DARK` as CSS hex colors (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`; surrounding whitespace ignored, empty means the default). Any other value, a named color included, stops the run before any image is written with an error naming the variable, since librsvg draws a malformed stop as black. `astro.config.ts` applies the same hex-color rule to the site's stylesheet settings.
- **Output**: `public/{SOURCE_DIR}/images/social/2024/20240105-giggle.png` (word, lowercased, spaces and punctuation kept) and `public/{SOURCE_DIR}/images/social/pages/browse-2023-april.png` (page path flattened into one slug); the homepage and word pages use the word's card. The `SOURCE_DIR` segment is omitted when unset.
- **One contract**: `utils/image-path-utils.ts` owns these paths. The generator writes them and `src/utils/image-utils.ts` links to them, so they cannot drift; the existing file names are the contract, since renaming a rule orphans every committed card upstream and downstream. The site emits absolute `og:image`/`twitter:image` URLs through `getFullUrl`, with each path segment passed through `encodeURI` plus `?` and `#`, so spaces become `%20` while `&` stays literal (`astro preview` decodes with `decodeURI`, which leaves `%26` undecoded; GitHub Pages serves both forms). `tests/architecture/social-images.spec.ts` checks the demo dataset and its cards under `public/demo/`, never a downstream site's own words: Vitest pins `SOURCE_DIR=demo`, so a site running the suite checks the demo words and cards it merges from upstream. It fails if any emitted URL names an untracked card or any tracked card is unreferenced. Both sides of that check read the page list from `getAllPageMetadata`, so it cannot see a listed page that has no route; `tests/architecture/page-routes.spec.ts` resolves every metadata path against the files under `src/pages` (`index.astro` serves its directory, a `[param]` file or directory matches any segment that no literal file or directory at that level claims, `.ts` endpoints are not pages) and fails on any path with no page.
- **Skip guard**: `.image-settings-hash` (in the `social/` directory) is JSON with two parts. `settings` is an md5 fingerprint of what determines every image's bytes, inputs and renderer alike: three probe SVGs rendered through the real template (colors, site title, dimensions, layout, and, from a 45-letter probe wider than the card, the scaling that fits a long word), the PNG options, both font files, and `sharp.versions` (sharp, libvips and the libraries bundled with it), so a sharp upgrade that re-quantizes the palette invalidates the cache on its own. `cards` maps each card's path (relative to the images directory) to a short hash of its own inputs, the exact text and date passed to `createSvg`, because a card's text can change while its path does not: page titles such as the most and least common letter come from the corpus, and a word card's file name lowercases the word while the card shows it as stored. Each run reads the marker once. A card is rendered when the settings differ, its entry is missing or differs, or its file is missing; otherwise it is skipped. `--force` renders every card. A marker that is missing, not JSON, or the bare fingerprint older runs wrote leaves the settings unknown, so the next run renders every card once. The marker is written (cards sorted by path, so its diff shows only real changes) only by a run that covered all words and all pages with no failures, whether that was the default run or `--words --generic` together, so `--word`, `--page`, and `--words` or `--generic` alone never certify the corpus. That run records every card it saw, so entries for cards that no longer exist drop out. `npm run build` copies `public/` verbatim and never regenerates images.
- **Demo cards and `SITE_TITLE`**: the site title is drawn on every card and is part of the settings fingerprint, and the cards committed under `public/demo/` carry `(Occasional) Word of the Day`: the `SITE_TITLE` in `.env.example`, and the title of the deployed demo site. A local run reproduces them only with that title: `SOURCE_DIR=demo SITE_TITLE="(Occasional) Word of the Day" npm run tool:generate-images`, or `SOURCE_DIR=demo npm run tool:local tools/generate-images.ts` with a `.env` copied from `.env.example`. Under any other title the settings differ and the run redraws every committed card. That includes no title at all, which is what the bare `tool:generate-images` gets when nothing sets one, and `Occasional Word of the Day`, the default `astro.config.ts` gives a build with no `.env`: the image tool does not read that default. Checked on one machine (macOS, the sharp `package-lock.json` pins) against the committed marker, `settings` `080f0a6067f2`: the example title computes that fingerprint and a forced render of one card gives the committed bytes; no title and the config default each compute another fingerprint and draw other bytes.
- **CI**: the Add Word workflow runs the complete generation (`npm run tool:generate-images`) after adding a word, not `--word`. With a current marker that renders the new word's card and any page card whose title the new word changed, and skips the rest; after a settings, font or sharp change it regenerates every card once and commits them with the refreshed marker (`git add data/ public/` picks up both). A single-image run could never write the marker, so the skip guard would stay stale in CI forever.
- **A site's cards and its `.env`**: a site's stored cards are drawn by Add Word, with the repository's variables. A local run draws with `.env` instead, and `SITE_TITLE` and the `COLOR_PRIMARY*` settings are part of the fingerprint, so a `.env` that differs from the variables in any of them redraws every stored card with the local values. The run says so before it draws anything, at warn: `Image settings differ from the ones the stored cards were drawn with, redrawing every card`, with the number of cards on record and the `SITE_TITLE` it is drawing. The same warning is expected, and the redraw right, after a setting was changed on purpose or a release changed the renderer, a font or the layout; a first run, with no cards on record, and `--force` do not warn. To draw locally with the repository's settings, export them for the one command, since a variable the environment already sets wins over `.env`:

  ```sh
  (
    # -R names the site. Without it, in a checkout that has an upstream remote, gh 2.102 read the engine's variables
    eval "$(gh variable list -R <owner>/<site> --json name,value -q '.[] | "export \(.name)=\(.value | @sh)"')"
    npm run tool:local tools/generate-images.ts
  )
  git status --short public/images    # only the cards you meant to change
  ```

## Testing

### Strategy

Tests are organized by what they validate. A regression gets its test at the layer where the bug lives, not one per layer. Unit tests validate logic. E2E tests validate the built output.

### Layer Boundaries

The key question for each test: what is the minimum layer that can verify this?

**Belongs at E2E** (requires built site in a real browser):

| What | Why |
|------|-----|
| Navigation flows (click link, page loads) | Route resolution only works against built output |
| An internal link is served with no redirect, at the URL its canonical names | Only a served build shows whether the href a page prints is the URL the page is served at |
| 404 handling | HTTP status codes require a running server |
| Meta tags exist in rendered HTML | Verifies build pipeline assembled components correctly |
| JSON-LD parses as valid JSON | Script tags must survive the build |
| RSS feed and sitemap return HTTP 200 | HTTP-level concerns |
| Skip-to-content keyboard flow | Real focus management in a real browser |
| Image alt text in rendered pages | Build-time content processing output |
| Link accessible text | Assembled page structure |

**Does NOT belong at E2E** (tested at lower layers):

| What | Better layer | Why |
|------|-------------|-----|
| URL generation logic | Unit | Pure function, no browser needed |
| Meta tag content values | Component | Input/output of a single component |
| JSON-LD structure and content | Component | Data structure validation |
| Schema.org field correctness | Component | Schema-utils produces the data |
| Word filtering/sorting | Unit | Pure function |
| Import boundary enforcement | Architecture | Static analysis |
| Statistics calculations | Unit | Pure function |

E2E tests follow user journeys: each test starts at an entry point, discovers content through navigation, and asserts on element presence. No hardcoded word URLs. No content-value assertions that duplicate component tests.

### Layers

| Layer | Location | Tool | Speed | Purpose |
|-------|----------|------|-------|---------|
| Unit | `tests/utils/`, `tests/adapters/` | Vitest | Fast | Pure function correctness |
| Component | `tests/src/` | Vitest | Fast | Astro wrappers, SEO, schemas |
| Architecture | `tests/architecture/` | Vitest | Fast | Import boundary enforcement |
| CLI Integration | `tests/tools/` | Vitest | Slow | Process spawning, protocol errors |
| E2E | `tests/e2e/` | Playwright | Slow | Built site navigation, SEO, accessibility |

`npm run typecheck` checks production code with `astro check` and the complete TypeScript test tree with the strict `tsconfig.tests.json` project. The production `tsconfig.json` continues to exclude tests.

### Coverage

Vitest thresholds: lines 80%, functions 80%, branches 85%, statements 80%. The thresholds catch tests that go missing; don't add a test only to raise coverage.

Excluded from Vitest coverage: build-time utilities (`static-file-utils.ts`, `static-paths-utils.ts`), pages, CLI tools (tested via integration), content config.

E2E tests run against the built site via `npm run test:e2e` (requires `npm run build` first). Playwright starts its own foreground `astro preview --ignore-lock` on port 4517 (`PORT` in `playwright.config.ts`, `reuseExistingServer: false`), so the run always serves the current `dist/` and never reuses a server on Astro's default 4321. `E2E_PORT` moves it for a second run on the same machine: `E2E_PORT=4518 npm run test:e2e`. They verify build assembly — that the pipeline correctly assembled components into working pages — not logic (which unit and component tests cover). Five spec files organized by concern:

- **`navigation.spec.ts`** — User journeys: discover a word and navigate between words, browse by year, footer section links, 404 handling
- **`seo.spec.ts`** — Build output wiring: meta tags present (description, canonical, OpenGraph, Twitter), an internal link served without a redirect at the URL its canonical names, no canonical link, `og:url` or breadcrumb JSON-LD on the 404 page, JSON-LD parseable, RSS and sitemap discoverable, the view transition opt-in inline in `<head>` on each page family
- **`accessibility.spec.ts`** — Structural a11y: skip-to-content keyboard flow, document language and viewport, image alt text, link accessible text, heading outline and named nav landmarks
- **`search.spec.ts`** — Header search: opens from the icon, filters by starts-with, navigates to a result
- **`stats.spec.ts`** — `/stats` visualizations: heatmap and connections graph present and navigable, no horizontal scroll

E2E always runs in demo mode — the CI workflow skips `setup-env` and explicitly sets `SOURCE_DIR=demo` (no `BASE_PATH`) so production env vars don't break test selectors. Every page URL in a test ends in a trailing slash (`trailingSlash: 'always'`): `page.goto('/stats/')`, `a[href="/stats/"]`. `astro preview` answers the slashless form with a 404, not the redirect a static host gives. File URLs (`/rss.xml`, `/sitemap-index.xml`) have none.

**Do not assert a view transition in E2E.** Whether a cross-fade runs is the browser's timing, not something the build assembles, so E2E asserts where the opt-in rule is (`seo.spec.ts`) and no spec waits for a transition. The opt-in, `@view-transition { navigation: auto }`, has to be inline in `<head>`. Chromium updates the active stylesheets when the parser inserts `<body>` ([`WillInsertBody`](https://github.com/chromium/chromium/blob/156.0.8078.4/third_party/blink/renderer/core/view_transition/view_transition_supplement.cc#L581)) and, when it reveals the page, reads the opt-in that update left, ahead of the first frame's own style update. A stylesheet still on the network at `<body>` blocks rendering, so it has loaded by the first frame, but it has not been counted yet. The [specification](https://drafts.csswg.org/css-view-transitions-2/#access-view-transition-in-new-doc) resolves the rule at reveal, so the timing is Chromium's. Through v3.28.0 the rule shipped in the external stylesheet (`/_astro/Layout.<hash>.css`), and a navigation that had to revalidate that file usually skipped its transition: the new page's `pagereveal` event had no `viewTransition`, and the navigation itself was unaffected. That was nearly every navigation under `astro preview`, which is Vite's preview server and sends `Cache-Control: no-cache` with every file, and on a host that sends a lifetime (GitHub Pages sends `max-age=600`) it was the first navigation after the cached copy went stale (seen locally with `max-age=2`, not measured on a live site).

The rule now lives alone in `src/styles/view-transition.css`, and `astro.config.ts` gives that file a chunk of its own (`codeSplitting.groups` under `vite.build.rollupOptions.output`). Astro's default `build.inlineStylesheets: 'auto'` puts a stylesheet smaller than Vite's `assetsInlineLimit` (4 KB) in a `<style>` in `<head>` and adds its hash to the CSP; where it sits next to another inlined sheet Astro merges the two into one `<style>` and hashes that. The split is a bundler option and nothing fails when it stops working: left in the Layout chunk, or with `inlineStylesheets: 'never'`, the rule ships external again and transitions go back to depending on the cache, which is what the `seo.spec.ts` check is for. Anything else added to that file is inlined on every page. The `prefers-reduced-motion` rule that turns the animation off stays in `global.css`: it styles the transition's pseudo-elements, which are painted after the render-blocking stylesheets have loaded.

Measured with Playwright's Chromium 156 on the build before the change and the build after it, 21 link clicks per server across the home, word, stats and browse pages, counting `pagereveal` events that carry a `viewTransition`: `astro preview` ran 2 before and 21 after; the same files from a static server that sends `no-cache`, 1 and 21; `python3 -m http.server`, which sends no `Cache-Control`, 21 and 21. With `prefers-reduced-motion: reduce` emulated the counts were 1, 1 and 21 before and 21, 21 and 21 after, and the transition group's computed `animation-name` was `none` in every run that had one. A build with `BASE_PATH=/blog` ran 21 of 21 on all three. Earlier measurements on the external rule located the cause: `max-age=600` on stylesheets ran 21 of 21; preview behind a proxy that rewrites only that header, 21; preview with a computed style requested as each stylesheet loaded, which makes Chromium count it, 21. Firefox and Safari were not measured, and neither was a live GitHub Pages site.

### CI Workflows

One workflow, `.github/workflows/ci.yml` (`CI`), holds every quality gate as a job. The job ids are the check names branch protection requires:

| Job | Runs | Check name |
|-----|------|------------|
| `lint` | `npm run lint`, then actionlint over `.github/workflows/` | `lint` |
| `typecheck` | `npm run typecheck` | `typecheck` |
| `test` | `npm test` | `test` |
| `build` | `npm run build` | `build` |
| `e2e` | `npm run test:e2e` | `e2e` |

CI triggers on pull requests to main and on pushes to main. The jobs run in parallel. E2E builds with demo defaults (no `setup-env`) then runs Playwright. The `automerge` job merges a Dependabot patch or minor update once every other job has passed, so a new job goes in its `needs:` list.

The `lint` job also checks the workflow files with [actionlint](https://github.com/rhysd/actionlint) 1.7.12 and `.github/actionlint.yaml`. It downloads the release archive with `gh release download`, the [documented way](https://github.com/rhysd/actionlint/blob/v1.7.12/docs/install.md#prebuilt-binaries) to install a prebuilt binary, and refuses one whose SHA-256 is not the digest pinned in the workflow, so moving to a new actionlint means changing the version and the digest together. It is not a lefthook job, so run `actionlint` locally before pushing a workflow change.

### Key Regression Test

CLI tools broke when Node.js-side code imported Astro-only modules (`#astro-utils/*`, `@sentry/astro`, Vite build-time globals). Permanently prevented by:
- `tests/architecture/utils-boundary.spec.ts` — detects forbidden imports in all Node.js-side directories (`utils/`, `adapters/`, `constants/`, `config/`)
- `tests/tools/cli-integration.spec.ts` — catches `astro:` protocol errors in real processes

The browser side has the mirror-image rule. Bundled `<script>` blocks import a few modules from `utils/` and `src/utils/`, and Vite ships whatever those import as values, so one re-export can put dictionary code in every page's JavaScript. `tests/architecture/client-imports.spec.ts` follows the value imports those scripts reach through `utils/`, `types/`, `constants/` and `src/utils/`, and fails on any edge (`module -> specifier`) missing from its explicit list of today's edges, so a new import fails even between modules already listed; a listed edge that is no longer reached must be removed. `import type` is always allowed.

## Linting

[oxlint](https://oxc.rs/docs/guide/usage/linter) is the only linter of the code; `.oxlintrc.json` is its whole configuration. `npm run lint`, the `lint` job of the CI workflow and the lefthook pre-commit job all read it, so a rule or option set there applies to all three. The workflow files have a linter of their own: CI's `actionlint` job runs actionlint on `.github/workflows/` in CI only (see CI Workflows under Testing); `npm run lint` and lefthook do not run it.

**Warnings fail.** `options.denyWarnings` makes a warning exit non-zero, and `options.reportUnusedDisableDirectives` reports a disable comment that no longer suppresses anything. A rule's level (`warn` or `error`) only labels the report.

**Plugins.** `plugins` replaces oxlint's default set, so it lists the defaults (`typescript`, `unicorn`, `oxc`; the ESLint core rules are always on) and four more: `import`, `promise`, `node`, `vitest`. The `correctness` category reports as errors and `suspicious` and `perf` as warnings, for every listed plugin; `rules` then pins individual rules. The `vitest` rules act on specs that import from `vitest`; the Playwright specs in `tests/e2e/` are outside them (a `test.only` there went unreported), and `forbidOnly` in `playwright.config.ts` covers that case in CI.

**Where rules differ.** `overrides` turns `no-await-in-loop` off in `adapters/`, `tools/` and `tests/` (sequential by design), applies `node/no-process-env` to `src/` only (it reads its environment through `astro:env/client`; CLI tools read `process.env`), turns `unicorn/consistent-function-scoping` off in `tests/` (helpers sit in the describe block that uses them), and turns `no-restricted-imports` off for the three root configuration files (see Relative imports below).

**Pinned for the code ethos.** Three rules outside those categories back conventions in [AGENTS.md](../AGENTS.md#code-ethos). `typescript/no-non-null-assertion` forbids `!`, the assertion `consistent-type-assertions` does not see: narrow with a guard or throw instead. `eqeqeq` requires `===` and `!==`, with `null: "ignore"` so `x == null` stays as the check for null or undefined. `import/first` keeps every import above other statements; in a spec the `vi.mock`, `vi.unmock` and `vi.hoisted` calls go below the imports, and Vitest still [hoists](https://vitest.dev/api/vi.html#vi-mock) them above.

**Relative imports.** Imports go through the `#` aliases in `package.json` `imports`. `import/no-relative-parent-imports` reports a `../` specifier and [`no-restricted-imports`](https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-restricted-imports) reports a `./` one (or a bare `.`) by the pattern `^\.(/|$)`, in static imports, `import type`, re-exports and `import()`, and in `.astro` frontmatter and `<script>` blocks. An override turns the second rule off for exactly three files, `astro.config.ts`, `sentry.client.config.js` and `sentry.server.config.js`: they sit at the repository root and import a sibling there (`./package.json`, `./sentry.config.shared.js`), and no alias maps to the root, so the relative form is the only one they have.

**`.astro` files.** oxlint lints a `.astro` file's frontmatter and its `<script>` blocks, `is:inline` included. It does not lint expressions in the template: the [compatibility page](https://oxc.rs/compatibility.html) lists Astro under "No template linting yet". `<style>` blocks are not linted either; there is no CSS linter.

**In the editor.** `.vscode/extensions.json` recommends the oxc extension and `.vscode/settings.json` sets `editor.codeActionsOnSave` to run `source.fixAll.oxc` on every save, the setting oxc's [editor setup](https://oxc.rs/docs/guide/usage/linter/editors.html) gives for fix-on-save. Which fixes that applies is the extension's `oxc.fixKind`, which this repository leaves unset. The extension's manifest declares that setting's default as `null`, and its [README](https://github.com/oxc-project/oxc-vscode#readme) marks `safe_fix` ("Only safe fixes will be applied") as the default kind. Assumption, not verified in an editor here: unset means `safe_fix`, the fixes `oxlint --fix` applies without `--fix-suggestions` or `--fix-dangerously`.

**Not enabled.** Type-aware rules (`no-floating-promises`, `switch-exhaustiveness-check` and the rest) need `oxlint-tsgolint` and [TypeScript 7](https://oxc.rs/docs/guide/usage/linter/type-aware); this repository is on TypeScript 6. There is no formatter: `.editorconfig` is the only formatting rule, and nothing checks it.

## Utility Architecture

### Two-Layer Separation

See [AGENTS.md - The Boundary](../AGENTS.md#the-boundary) for the principle and rationale.

**`utils/`** (pure Node.js):

| File | Purpose |
|------|---------|
| `breadcrumb-utils.ts` | Breadcrumb navigation generation |
| `date-utils.ts` | YYYYMMDD parsing, formatting, validation |
| `definition-markup.ts` | Definition tag recognition and strict legacy validation |
| `definition-text.ts` | Definition markup parser, cross-reference checks, `toDefinitionSegments()` |
| `i18n-utils.ts` | `t()` translation, `tp()` pluralization |
| `logger-core.ts` | Logger factory (SentryBridge, output filter) |
| `logger.ts` | CLI logger wrapper with @sentry/node |
| `sentry-options.ts` | Sentry options pinned to SDK 10 behaviour, shared by the browser, server and CLI inits |
| `page-metadata-utils.ts` | Page titles and descriptions (cached) |
| `text-pattern-utils.ts` | Palindrome, double/triple letter detection |
| `text-utils.ts` | `slugify()`, syllable counting |
| `url-utils.ts` | Route URL builders |
| `stored-word-validation.ts` | Canonical stored-word shape guards |
| `word-data-normalizer.ts` | Offline legacy-record normalization |
| `attribution-utils.ts` | Dictionary credits and licences read from stored records |
| `word-data-utils.ts` | Displayability rule, add-time acceptance, word senses and details, word filtering by year/length/letter/pos |
| `word-stats-utils.ts` | Statistics computation |
| `word-validation.ts` | Client-safe `words.json` index guard |

**`src/utils/`** (Astro-specific):

| File | Purpose |
|------|---------|
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
| `utils/`, `adapters/`, `constants/`, `config/` | `#utils/*`, `#types`, `#constants/*`, `#config/*`, `#adapters/*`, Node built-ins | `#astro-utils/*`, `astro:*`, `@sentry/astro` |
| `tools/` | Same as above + `#tools/*` | `#astro-utils/*`, `astro:*`, `@sentry/astro` |
| `src/utils/` | Everything above + `#astro-utils/*`, `astro:*`, `@sentry/astro` | — |
| `src/pages/`, `src/components/` | Everything | — |

The thin-wrapper delegation pattern avoids logic duplication. See AGENTS.md for the canonical example.

## Accessibility

- Semantic HTML with proper heading hierarchy and landmarks
- Skip-to-content link for keyboard users
- Descriptive alt text on generated images
- ARIA attributes for interactive elements
- Color contrast meeting WCAG AA
- Mobile-first responsive design

## Deployment

### GitHub Actions

Jobs use the explicit `ubuntu-26.04` runner image. Jobs that execute project code install the Node version `.nvmrc` names, the engine checkout's in the reusable workflows. External actions track their current stable major tags, which receive compatible patch updates. Every job that runs steps sets `timeout-minutes`, so a hung step is cancelled in minutes and not at GitHub's [360-minute default](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idtimeout-minutes): 10 for Lint, Typecheck, Test and Build, 30 for E2E, and 15 for each job of Site Deploy and Site Add Word, whose deploy job has to outlast the 10 minutes `actions/deploy-pages` waits for a deployment. A job that calls a reusable workflow [cannot set one](https://docs.github.com/en/actions/reference/workflows-and-actions/reusable-workflows#supported-keywords-for-jobs-that-call-a-reusable-workflow), so Deploy and Add Word take the timeouts of the workflows they call. TypeScript stays on 6.x while `@astrojs/check` requires TypeScript 5 or 6.

The workflow files are the reference for their steps; this is what each one is for.

| Workflow | File | Runs |
|----------|------|------|
| Add Word | `.github/workflows/add-word.yml` | Manual dispatch with a word, an optional date, and overwrite and preserve-case switches |
| Deploy to GitHub Pages | `.github/workflows/deploy.yml` | Push to main, manual dispatch, and after an Add Word run on main that succeeded |
| Site Deploy | `.github/workflows/site-deploy.yml` | Called by Deploy, here and in each downstream site |
| Site Add Word | `.github/workflows/site-add-word.yml` | Called by Add Word, here and in each downstream site |

**Add Word** calls **Site Add Word** with the same four inputs, and keeps `contents: write` and the `add-word` concurrency group, so two runs never write at once.

**Site Add Word** checks out the engine and installs, then checks out the tip of the dispatched branch into `site/`, so a run that waited behind another starts from the commit that run pushed, and keeps that checkout's credentials for the push. It runs `setup-env` and overlays the site content exactly as Site Deploy does. It checks the dictionary settings before adding anything and stops with an error if `DICTIONARY_ADAPTER` is empty, if either variable spans more than one line or names an adapter other than `merriam-webster` or `wiktionary` (any case), or if a named adapter's API key is missing (Wiktionary needs none). `DICTIONARY_FALLBACK` may be empty for the default Wiktionary fallback, `none` in any case for no fallback, or a comma-separated list. It then runs `npm run tool:add-word` followed by the complete `npm run tool:generate-images` in `engine/`, copies back into `site/` only word JSON under the words directory, PNG cards under `images/social` and `.image-settings-hash`, in whichever layout `SOURCE_DIR` selects, and stages only those. The copy compares content and never deletes. It commits as the repository owner with the message `Add word: <word>` and pushes to the branch it was dispatched on; a push that is not a fast-forward fails the run, and nothing is ever forced. A run that changes nothing ends with a notice instead of a commit. Workflow inputs reach the shell as environment variables, never as `${{ }}` expressions inside `run:`, so a word is always data and never script.

**Deploy** calls **Site Deploy**, the workflow a downstream site's Deploy calls too, so the demo site builds exactly as a site does. Deploy keeps the triggers, the permissions, the `pages` concurrency group and the gate that skips failed or cancelled Add Word runs. The group does not cancel a run in progress (`cancel-in-progress: false`, as in GitHub's [Pages starter workflow](https://github.com/actions/starter-workflows/blob/e3c451d60f119b71caebf13c98ac45da6e15b4b7/pages/static.yml#L18-L22)), so a deployment that has started finishes; of the runs waiting behind it GitHub keeps only the newest, which builds the latest commit. A push made with `GITHUB_TOKEN` starts no `push` run, so Add Word's completion is what triggers the deploy of a new word. For `workflow_run`, `GITHUB_SHA` is the last commit on the default branch, so the site checkout builds the commit Add Word just pushed.

**Site Deploy** checks out the calling repository into `site/` and the engine into `engine/` (Engine ref, below), runs `npm ci` and then `setup-env` in `engine/`, and mirrors `site/data/` and `site/public/` over the engine's with `rsync --delete`, keeping the engine's `favicon.svg` when the site has none. Every copy compares content (`--checksum`), since two checkouts made in the same second can hold a same-size file that rsync's size and time check would skip. It then runs the complete `npm run tool:generate-images`, so an engine or theme change never deploys stale cards (current cards are skipped and nothing is committed), builds in `engine/`, whose own `.git` gives the build its release fingerprint, stops if `engine/dist/_astro` holds a `*.js.map` (with Sentry on the build generates source maps, uploads them and deletes them, and one left behind would be published), and uploads `engine/dist`. A separate deploy job holds `pages: write`, `id-token: write` and the `github-pages` environment, which a job that calls a reusable workflow cannot declare. Before copying anything it stops when `SOURCE_DIR` is not `demo` in this repository or not empty in any other, rather than publish the other site's content, when the site has no words directory or `public/`, which mirroring would otherwise empty, and when anything under the site's `data/` or `public/` is a symbolic link, which `rsync -a` copies as a link, so the tools would write through it and the build read through it outside `engine/`.

**Engine ref.** Site Deploy and Site Add Word check the engine out at `job.workflow_repository` and `job.workflow_sha`, the repository and commit of the workflow file that defines the running job ([job context](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#job-context)), so the code is always the commit the called workflow itself runs from, and a caller passes nothing that names the engine. actionlint 1.7.12 does not know the `job.workflow_*` properties, so `.github/actionlint.yaml` ignores its undefined-property error for exactly those four in these two workflows until it does. A `./` call runs the called workflow from the caller's own commit, so the engine checkout is the calling repository at that commit. This repository calls that way for the demo site, and so does every downstream site (Downstream Sync): its Deploy and Add Word are this repository's files, so they call the reusable workflows with `./` and check out the site's own commit as the engine. In a site's Deploy `site/` and `engine/` are therefore the same commit, so the overlay copies and deletes nothing: the site's `data/demo` and `public/demo`, which it tracks from this repository, stay where they are, `SOURCE_DIR` empty builds its own `data/words`, and `public/demo` is published with the rest of `public/`. In its Add Word `site/` is the tip of the dispatched branch and `engine/` the dispatched commit, so the overlay brings in only content pushed since the dispatch. The `SOURCE_DIR` check tells this repository from the rest by the name in `ENGINE_REPOSITORY`, not by `job.workflow_repository`, which a `./` call makes the calling repository. The two checkouts also let a repository that holds only content call these workflows at a pinned release. That layout was tried and dropped, because such a repository can neither sync nor run the tools itself; nothing here supports it, and the workflows are as they were.

**Environment.** Build, Site Deploy and Site Add Word all run the `.github/actions/setup-env` composite action, which copies repository variables and explicitly supplied secrets into the job by name. Each runs `npm ci` before it, so no dependency's install script has the secrets in its environment, and Site Add Word checks out the site only after `npm ci` too, so no install script can read the credentials that checkout keeps, which can push to the site. Build and Site Deploy receive only the seven values Astro may need while building: `GA_ENABLED`, `GA_MEASUREMENT_ID`, `SENTRY_ENABLED`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN`. Build passes all seven only when the event is a push, which for Build is a push to main: a pull request's build gets them blank, so Sentry is off (`astro.config.ts` adds the integration only when `SENTRY_ENABLED` is `true` and `SENTRY_DSN` is set), nothing is uploaded with the auth token, the build is tagged `development`, and Google Analytics is off (the layout adds its scripts only when `GA_ENABLED` is true and `GA_MEASUREMENT_ID` is set). Site Add Word receives only `MERRIAM_WEBSTER_API_KEY`, `SENTRY_ENABLED` and `SENTRY_DSN`; its Node logger does not use the other build credentials. The reusable workflows declare those named secrets as optional, so omitted settings remain blank, and cannot receive an arbitrary repository secret. Site Deploy's build job has no environment, so a value stored only on the `github-pages` environment does not reach the build.

**Install scripts.** `allowScripts` in `package.json` records which dependencies may run an install script, the field `npm approve-scripts` and `npm deny-scripts` maintain (`npm help approve-scripts`). npm 11.17 still runs every script and only warns about one with no entry; it says a later release will block those. Two are approved at the version reviewed, so a new version of either has to be approved again with `npm approve-scripts <name>`: `wordpos`, whose script writes the `fast-index.*.json` files into `wordnet-db` that the WordNet adapter cannot load without, and `lefthook`, whose script runs `lefthook install` outside CI, as this package's own `prepare` script also does. `fsevents` is denied by name: the registry lists it with a `node-gyp rebuild` install script, but the package ships the built binary and no `binding.gyp` to rebuild.

`VAR_NAMES` is read only from repository variables; the action's named secret inputs are read only from secrets in the calling workflow. API keys (`*_API_KEY`), `GA_*` and `SENTRY_*` are secrets and everything else is a variable. `tests/architecture/env-transport.spec.ts` fails when a variable in the `astro.config.ts` env schema is not covered or when a name is in the wrong category, while `tests/tools/site-workflows.spec.ts` fixes the exact secret scope of each operation. `SENTRY_ENVIRONMENT` is supplied by neither repository store: the action sets it from its `sentry-environment` input, which defaults to `production`, and only Build passes one, `development` for a pull request. The action also sets `TZ` from the `SITE_TZ` repository variable (default `America/New_York`), so "today" is the same date when a word is added and when the site is built. Every value is written to `$GITHUB_ENV` in the multiline `NAME<<delimiter` form with a random delimiter per value, so a value that spans lines stays one variable instead of failing the step or setting others. Before it writes a secret, the action masks each non-blank line of its value with `::add-mask::`. Short values are masked too, so with `GA_ENABLED` set to `true` every `true` in the rest of the job's log reads `***`. Variables are never masked.

### Build Pipeline

1. Environment validation (required vars)
2. Content Collections load word data
3. Static page generation
4. Asset optimization (CSS, images)
5. Deploy to GitHub Pages or other static host

Social cards are not part of the build: they are generated by the image tool, committed, and served from `public/`.

### Deployment Scenarios

```sh
# Root (example.com)
SITE_URL="https://example.com" BASE_PATH="/"

# Subdirectory (example.com/vocab/)
SITE_URL="https://example.com" BASE_PATH="/vocab"

# GitHub Pages (username.github.io/repo/)
SITE_URL="https://username.github.io" BASE_PATH="/repo"
```

### Downstream Sync

This repository is the engine: the code, the tools, the workflows and a demo site. A downstream site (wordbug, wordbun) is a full copy of it in a repository of its own, with this repository as its `upstream` remote. The site adds its own words, keeps its own data, runs the tools and the GitHub Actions workflows itself, and takes each release by merging `upstream/main` with `npm run tool:sync`. The sites are not GitHub forks: each is a separate repository that shares this one's history, which is what lets it merge. [Starting a Site](README.md#starting-a-site) is how to make one.

| Path | Whose | Rule |
|------|-------|------|
| `data/words/`, `public/images/` | The site's | The engine tracks nothing under either, so no release can touch a site's words or cards |
| `public/favicon.ico`, `public/favicon.svg` | Both | The only files both sides hold: the engine ships them and a site may replace them, so an engine change to one conflicts in a site that did |
| Everything else, `data/demo/` and `public/demo/` included | The engine's | Changed only upstream. A site that needs a change makes it here and syncs |

Those two rules are what keep the merges clean. Of 44 engine merges replayed into the two sites, 42 were clean, and both conflicts were engine files that had been edited in a site. `tests/architecture/site-content.spec.ts` fails when this repository tracks anything under `data/words/` or `public/images/`; `.gitignore` cannot hold that rule, because the sites get the same file and must track both. The suite runs in every site too, so the test asserts only where `origin` is this repository. Nothing checks the second rule: it is the site owner's to keep.

A site's Deploy and Add Word are this repository's files, so they call the reusable workflows with `./` at the site's own commit (Engine ref, above) and need nothing but the site's variables and secrets. A site leaves `SOURCE_DIR` unset or empty, which reads `data/words/` and `public/images/`; this repository keeps `SOURCE_DIR=demo`.

`npm run tool:sync` (`tools/sync-upstream.sh`) brings upstream changes into a site without touching `main`: it fetches `upstream`, creates `sync/upstream-<short sha>` from `main`, and merges `upstream/main` into it with `--no-ff --no-commit`, so even a fast-forward stops before a commit exists. It then runs `npm ci` and the quality gates in order (lint, typecheck, test, then the build and E2E with `SOURCE_DIR=demo BASE_PATH=/`), then the own-words gate below, and commits the merge only when every gate passes without changing a file. A commit hook runs after the gates, so the sync exits 1 when one refuses the commit or changes what is committed (lefthook's `oxlint --fix` stages its fixes). It never pushes: review the branch, fast-forward `main` to it, and push it with the command it prints, `git push origin main`, which names `origin` because in a clone made with `-o upstream` `main` tracks upstream, where a bare `git push` would go. `npm run tool:sync -- --skip-e2e` skips E2E when Playwright browsers are not installed.

**Own words.** The build and E2E gates read the demo words. Of the others only typecheck reads the site's: `astro check` loads the content collection, so with `SOURCE_DIR` unset it holds each stored word to the collection schema. What a page needs beyond the schema is found only by building, so after E2E the sync runs `env SOURCE_DIR= npm run build`, the build Deploy runs, when the repository tracks any file under `data/words/`. A release that rejects a stored word then stops the sync with the merge uncommitted, instead of failing Deploy after the push. `SOURCE_DIR` is set and empty, so it selects `data/words/` whatever the shell or `.env` holds (a set variable wins over `.env`). The other settings come from `.env` when the checkout has one, and from the defaults in `astro.config.ts` when it has none, which the sync says; the build needs no setting that lacks a default. Google Analytics follows `.env` here as in the demo build before it; Sentry does not (below). A repository that tracks no word of its own, such as a new copy, skips the gate, because the build fails without a word; the upstream repository never reaches it. The build writes only ignored files (`dist/`, `.astro/`). It is the last gate because it replaces the `dist/` E2E serves.

**The builds send nothing to Sentry.** A build with `SENTRY_ENABLED=true`, a DSN and `SENTRY_AUTH_TOKEN` creates a Sentry release and uploads source maps, which is right for Deploy and wrong for a merge nobody has reviewed. Both sync builds, the demo build and the own-words build, therefore run with `SENTRY_ENABLED=false` on their command line, whatever the shell or `.env` holds: `astro.config.ts` loads `.env` with `process.loadEnvFile()`, which keeps a variable the environment already sets, and `astro:env` reads it through Vite's `loadEnv`, which copies `process.env` over what the file gave. Node's reference states that precedence for `--env-file` ([Node.js CLI](https://nodejs.org/api/cli.html#--env-filefile)) and is silent on it for `loadEnvFile`; for both readers it is observed rather than documented: a sync of a copy whose `.env` turned Sentry on with a token ran both builds without the Sentry build plugin, and the built pages carried no DSN. With Sentry off the config leaves the Sentry integration out, so no release is created, nothing is uploaded and no source map is generated. This covers the builds only: E2E serves the demo build with `astro preview` and builds nothing, and the other gates and the normalizer run as before, with whatever Sentry settings the shell exports.

**Normalizer report.** A release can change the stored format without rejecting the old one, which the build then accepts. So after the own-words build the sync runs `npm run tool:normalize-word-data -- --dry-run` over `data/words/` and reports how many stored files the normalizer would rewrite, or that it could not check them all, with the command to run. It is a report and never a gate: nothing is written and the merge is committed either way, because rewriting stored words is the owner's own commit.

**The script that runs is the site's.** `npm run tool:sync` starts the copy of `tools/sync-upstream.sh` the site had before the merge, and that copy runs to the end. A gate or check a release adds to the script therefore first runs in the sync after the one that brings it in.

It refuses to start below the repository root, off `main`, during a merge or rebase, or with modified, staged or untracked files, and never stashes; ignored files such as `.env` are fine. A `package-lock.json` conflict resolves to upstream's lockfile only when the merged `package.json` is upstream's. Any other conflict, or a failing gate, stops with the merge staged on the sync branch and the commands to finish or abandon it. An existing branch of the same name is refused. Merge-based (not rebase) so downstream can regular-push without force, and for the same reason a site needs this repository's history: Git refuses to merge histories with no common ancestor unless given `--allow-unrelated-histories`, which the sync never passes. It checks for a common commit after the fetch and before it creates a branch, so a copy made without the history is told so, pointed at [Starting a Site](README.md#starting-a-site) and left as it was, rather than left on a sync branch with a conflict report that names no file. A shallow clone fails the same check, because its history is cut off above the shared commit, and is told to fetch the rest (`git fetch --unshallow origin`). The script no-ops in the upstream repo (no `upstream` remote). `tests/tools/sync-upstream.spec.ts` runs it against real repositories in a temp dir with a fake `npm`.

### Content Security Policy

CSP is enabled via `security.csp` in `astro.config.ts`. Astro auto-hashes its bundled scripts and processed component styles. Dynamic per-site content that cannot be auto-hashed is served from same-origin endpoints:

| Endpoint | Role |
|----------|------|
| `src/pages/theme.css.ts` | Theme color custom properties (replaces inline `<style>`) |
| `src/pages/ga-init.js.ts` | GA bootstrap (replaces inline `<script>`) |

Only external script source: `https://www.googletagmanager.com` (gtag.js loader). Hardening: `object-src 'none'`, `base-uri 'self'`. `worker-src 'self' blob:` allows Sentry Session Replay's compression worker. `connect-src`/`img-src` intentionally unrestricted (GA/Sentry beacons).

**Pattern**: Dynamic inline content must become a same-origin endpoint. Neither `<style set:html>` nor `<script is:inline>` is auto-hashed. `define:vars` produces CSP-blocked inline style attributes.

A processed stylesheet that Astro inlines is hashed for the page it lands on, with no hash kept by hand. `src/styles/view-transition.css` relies on that: the build splits it into its own chunk so that it is inlined on every page (Testing, Coverage, has the reason). A `<style is:inline>` written in the layout is not a shortcut. Astro does not hash it (0 of 206 pages in a trial build), and it applies only because Astro appends the policy `<meta>` after the authored `<head>` content, which a `<meta>` policy does not govern; `/theme.css` is linked ahead of the policy the same way and is covered by `'self'` regardless.

Markdown syntax highlighting is disabled (`markdown.syntaxHighlight: false`): Shiki's inline styles are CSP-incompatible and the site renders no markdown.

## Constraints

- **Static only**: All pages pre-rendered; changes require rebuild
- **One word per date**: Each YYYYMMDD maps to exactly one word
- **Global uniqueness**: Each word used once across all dates
- **No future dates**: Words can only be added for today or past
- **Family-friendly**: Educational tone throughout
- **WCAG AA**: Accessibility compliance required

## Architecture History

### September 2026 - Node 26 and Native TypeScript

- Node.js 26 requirement (upgraded from 24)
- `package.json` `imports` is the only alias table: `compilerOptions.paths` removed from `tsconfig.json`; TypeScript alias targets end in `.ts` so Node's resolver (no extension guessing) loads them unaided
- CLI tools run as `node tools/<tool>.ts` (type stripping); `tsx` removed. `tool:local` loads `.env` with `--env-file-if-exists`
- `astro.config.ts` loads `.env` with `process.loadEnvFile()`; `dotenv` removed
- `erasableSyntaxOnly` enabled so the compiler rejects syntax Node's type stripping cannot run

### June 2026 - CSP and Progressive Enhancement

- Native CSS view transitions: `<ClientRouter />` removed; `@view-transition { navigation: auto }` added to `src/styles/global.css` with `prefers-reduced-motion` guard. Ships zero JS; cross-fades same-origin navigations (Chromium/Safari; Firefox partial); plain navigation elsewhere. Reason: Astro dropped CSP support for `ClientRouter`.
- CSP enabled via `security.csp` in `astro.config.ts`; dynamic inline content migrated to same-origin endpoints (`src/pages/theme.css.ts`, `src/pages/ga-init.js.ts`).
- Removed: `src/utils/build-utils.ts` and `types/window.d.ts` (with `window.app` debug global).

### February 2026 - Environment and Theming

- `astro:env` migration: 21 Vite `define` globals replaced with Astro's type-safe env schema (`envField` in `astro.config.ts`, accessed via `astro:env/client`). Four computed build-time constants remain as Vite defines.
- Environment-driven dark mode: opt-in via `COLOR_DARK_*` env vars, conditional `prefers-color-scheme` media query emitted only when configured.
- SEO fixes: semantic `<nav>` in header, `itemCount` in CollectionPage structured data, redundant hreflang removal.

### February 2026 - Codebase Audit

- Import alias migration: `~` (Vite resolve.alias) to `#` (Node.js subpath imports)
- Config conversion: `.mjs` to `.ts` (`astro.config.ts`, `vitest.config.ts`)
- TypeScript strictness: `strictNullChecks`, `noUncheckedIndexedAccess`
- DRY consolidation: stats function duplication eliminated
- ES6+ modernization: `Object.groupBy()`, `Array.findLast()`, `util.parseArgs()`
- Node.js 24 requirement (upgraded from 22)
- Logger DRY: shared factory (`logger-core.ts`) with env-specific Sentry bridges
- Boundary enforcement expanded: architecture tests now cover `adapters/`, `constants/`, `config/` (not just `utils/`)

### January 2025 - Tool Consolidation

- Unified image generation: merged separate tools into `generate-images.ts`
- Shared help system: `tools/help-utils.ts`

### Content Collections Migration

- Astro 5 Content Layer API
- Build-time path injection via `__WORD_DATA_PATH__`
