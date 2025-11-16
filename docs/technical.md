# Technical Documentation

## Architecture Overview

### Framework & Stack
- **[Astro](https://astro.build/)** - Static site generator with zero-JS by default
- **TypeScript** - Type safety throughout the codebase
- **Node.js 20+** - Runtime environment
- **[Vitest](https://vitest.dev/)** - Testing framework
- **[Sharp](https://sharp.pixelplumbing.com/)** + OpenType.js - Image generation

### Data Architecture
- **Static Generation**: All pages pre-rendered at build time
- **Content Collections**: Astro's built-in content management via `src/content.config.ts`
- **File-based Data**: Words stored as JSON files in `data/{SOURCE_DIR}/words/{year}/`
- **Environment-Driven Configuration**: All customization via environment variables

## File Structure

```
src/
├── content.config.ts        # Astro Content Collections config
├── components/              # Reusable Astro components
├── layouts/                 # Page layout templates
├── pages/                   # Route definitions
├── utils/                   # Client/Astro utilities (13 files)
├── styles/                  # CSS files
├── assets/                  # Static assets
└── images/                  # Image assets

utils/                       # Shared utilities (Node.js + Astro)
├── date-utils.ts           # Date manipulation functions
├── word-data-node.ts       # Node.js word data utilities
├── word-data-processor.ts  # Word data processing
└── word-validation.ts      # Dictionary data validation

tools/                       # CLI tools for content management
├── help-utils.ts           # Shared help system
├── add-word.ts             # Add new words
├── generate-images.ts      # Generate social images (consolidated)
├── generate-generic-images.ts # Generate generic page images
├── generate-page-image.ts  # Generate specific page image
├── ping-search-engines.ts  # SEO ping utility
├── regenerate-all-words.ts # Refresh word data
└── utils.ts                # Tool-specific utilities

config/                      # Configuration files
└── paths.ts                # Path configuration

constants/                   # Application constants
├── stats.ts                # Statistics definitions and slugs
└── urls.ts                 # URL constants

locales/                     # Internationalization
└── en.json                 # English translations

types/                       # Shared type definitions (10 files)
├── adapters.ts             # Dictionary API types
├── common.ts               # Common shared types
├── index.ts                # Main types export
├── word.ts                 # Word data structures
├── stats.ts                # Statistics types
├── schema.ts               # Schema types
├── seo.ts                  # SEO types
├── vite.d.ts               # Vite definitions
├── window.d.ts             # Window extensions
├── wordnik.ts              # Wordnik API types
└── opentype.js.d.ts        # OpenType.js definitions

adapters/                    # Dictionary API adapters  
├── index.ts                # Adapter factory
└── wordnik.ts              # Wordnik implementation
```

## Environment Configuration

### Required Variables
```bash
WORDNIK_API_KEY             # Dictionary API access (required)
SITE_URL                    # Canonical site URL (required for builds)
```

### Site Configuration
```bash
SITE_TITLE                  # Site name (default: "Word of the Day")
SOURCE_DIR                  # Data source directory (default: "demo")
DICTIONARY_ADAPTER          # Dictionary service (default: "wordnik")
```

### Color Customization
```bash
COLOR_PRIMARY               # Primary brand color
COLOR_PRIMARY_LIGHT         # Light variant
COLOR_PRIMARY_DARK          # Dark variant
```

### Feature Flags
```bash
SENTRY_ENABLED              # Error tracking (default: false)
SHOW_EMPTY_STATS            # Show empty stats pages in dev (default: true)
```

## Word Data Management

### Storage Format
Each word is stored as a JSON file at `data/{SOURCE_DIR}/words/{year}/{YYYYMMDD}.json`:

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
  ]
}
```

### Content Collections Integration
- **Build-time Loading**: Words loaded via Astro Content Collections at build time
- **Type Safety**: Full TypeScript support for word data structures  
- **Caching**: Automatic caching and invalidation during development
- **Sorting**: Consistent date-based sorting (newest first)

### Vue-Style Computed Derivatives
The codebase implements a reactive computed pattern similar to Vue.js for optimal performance:

- **Single Collection Load**: `allWords` loaded once at build time via `getAllWords()`
- **Pre-computed Values**: Statistics computed once and cached (e.g., `wordStats`, `letterPatternStats`)
- **Computed Derivatives**: Filtered views created as functions (e.g., `getWordsForYear(year)`)
- **Direct Usage**: Components import computed values directly without aliasing

**Example Pattern:**
```typescript
// Single source collection
export const allWords = await getAllWords();

// Pre-computed statistics (expensive operations done once)
export const wordStats = getWordStats(allWords);
export const availableYears = getAvailableYears(allWords);

// Function derivatives for parameterized access
export const getWordsForYear = (year: string) => getWordsByYear(year, allWords);
```

**Performance Impact**: 10%+ build time improvement by eliminating duplicate calculations

### Validation Rules
- **Unique Words**: Each word can only be used once across all dates
- **Date Constraints**: Words cannot be added for future dates
- **Dictionary Validation**: Words must exist in configured dictionary service
- **Format Validation**: Strict YYYYMMDD date format enforcement

## Tools & CLI

### Unified Tool System
All tools share common patterns:
- **Consistent Help**: Shared help system with environment variable documentation
- **Manual Environment Support**: Tools work with manually passed environment variables (for GitHub Actions)
- **Error Handling**: Structured logging with message + data object format
- **Node.js Only**: No Astro dependencies in tools

### Tool Usage Patterns

**Local Development** (with `.env` file):
```bash
npm run tool:local tools/add-word.ts serendipity
npm run tool:local tools/generate-images.ts --all
```

**Production/CI** (with manual environment variables):
```bash
WORDNIK_API_KEY=xxx SOURCE_DIR=words npx tsx tools/add-word.ts serendipity
```

### Available Tools

#### `add-word.ts`
Adds new words with full validation and image generation.

**Features:**
- Dictionary validation via configured adapter
- Duplicate word detection across all dates
- Future date prevention
- Automatic social image generation
- Overwrite protection with `--overwrite` flag

#### `generate-images.ts` 
Consolidated image generation tool (replaces separate single/bulk/generic tools).

**Features:**
- Generate single word image: `generate-images.ts serendipity`
- Generate all word images: `generate-images.ts --all`
- Generate all generic page images: `generate-images.ts --generic`
- Generate specific page image: `generate-images.ts --page stats`
- SVG-to-PNG conversion with Sharp
- Year-based output directory organization
- Gradient text rendering with custom colors
- Force regeneration with `--force` flag

#### `regenerate-all-words.ts`
Refreshes all word data with fresh dictionary definitions.

**Features:**
- Batch processing with rate limiting
- Dry-run mode for preview
- Flexible JSON field path extraction
- Progress tracking and error reporting

#### `ping-search-engines.ts`
Notifies search engines of sitemap updates for improved SEO.

**Features:**
- Pings Google and Bing with sitemap URL
- Configurable search engine endpoints
- Error handling and retry logic
- GitHub Actions integration support

## Image Generation System

### Technical Implementation
- **SVG Templates**: Programmatically generated SVG with OpenType.js text rendering
- **PNG Conversion**: Sharp library for high-quality rasterization
- **Typography**: OpenSans font family with Regular and ExtraBold weights
- **Color System**: CSS-in-JS gradients using theme colors

### Output Structure
```
public/images/social/
├── {year}/                 # Word images by year
│   ├── 20250101-word.png
│   └── 20250102-word.png
└── pages/                  # Generic page images
    ├── stats.png
    └── words.png
```

### Image Specifications
- **Dimensions**: 1200x630px (OpenGraph standard)
- **Compression**: PNG with palette optimization
- **Quality**: 90% with 128 color palette
- **Typography**: Responsive text sizing with automatic scaling

## URL Management & Navigation

### URL Architecture Overview

The site uses a **two-tier URL system** to support both root deployments (`example.com`) and subdirectory deployments (`example.com/blog/`):

#### Environment Variables
- **`SITE_URL`**: Full canonical domain (e.g., `https://example.com`)
- **`BASE_PATH`**: Subdirectory path for deployment (e.g., `/blog` or `/`)

#### URL Generation Functions
- **`getUrl(path)`**: Generates relative URLs with BASE_PATH for internal navigation
  - Example: `getUrl('/words/hello')` → `/blog/words/hello` (if BASE_PATH="/blog")
- **`getFullUrl(path)`**: Generates absolute URLs for SEO/social sharing
  - Example: `getFullUrl('/words/hello')` → `https://example.com/blog/words/hello`
  - **Implementation**: Uses `getUrl()` internally to ensure BASE_PATH consistency

#### Component Usage
- **SiteLink Component**: All internal navigation uses `getUrl()` for proper BASE_PATH handling
- **WordLink Component**: Specialized word-to-word navigation with date context
- **Layout Component**: Uses `getFullUrl()` for canonical URLs, social tags, and schema.org data

#### Deployment Scenarios
```bash
# Root deployment (example.com)
SITE_URL="https://example.com"
BASE_PATH="/"

# Subdirectory deployment (example.com/vocab/)
SITE_URL="https://example.com" 
BASE_PATH="/vocab"

# GitHub Pages deployment (username.github.io/repo/)
SITE_URL="https://username.github.io"
BASE_PATH="/repo"
```

#### Critical Design Principles
1. **Always use `getUrl()` for internal links** - Never hardcode paths
2. **Always use `getFullUrl()` for absolute URLs** - Never concatenate manually
3. **Astro's sitemap integration** automatically uses `site` config for full URLs
4. **Never bypass BASE_PATH** - It breaks subdirectory deployments

### Route Structure
```
/                           # Homepage (current word)
/words/                     # All words index
/words/{word}               # Individual word pages
/{YYYYMMDD}/                # Date-based word access
/stats/                     # Statistics hub
/stats/{category}           # Specific statistics pages
```

## Statistics System

### Data Processing
- **Build-time Computation**: All statistics calculated during static generation
- **Cached Results**: Expensive calculations cached and reused
- **Conditional Generation**: Empty stats pages only generated in development

### Available Statistics
- **Letter Analysis**: Frequency, patterns, alphabet coverage
- **Word Patterns**: Palindromes, double letters, alphabetical sequences
- **Reading Streaks**: Current and historical consecutive reading streaks
- **Milestones**: Chronological milestones (1st, 25th, 50th, 100th words)
- **Linguistic Features**: Syllable counts, vowel/consonant analysis

## Testing Strategy

### Test Organization
```
tests/
├── adapters/               # Dictionary API adapter tests
├── architecture/           # Architectural boundary enforcement tests
├── tools/                  # CLI tool integration tests
├── utils/                  # Utility function tests
└── src/utils/              # Astro-specific utility tests
```

### Test Layers

#### 1. Unit Tests (`tests/utils/`, `tests/adapters/`)
- **Purpose**: Verify individual function correctness
- **Scope**: Pure functions, data transformations, API adapters
- **Run Time**: Fast (milliseconds)
- **Example**: Testing `slugify()` converts "Hello World" to "hello-world"

#### 2. Architecture Tests (`tests/architecture/`)
- **Purpose**: Enforce architectural boundaries and prevent DRY violations
- **Scope**: Import dependencies, code duplication detection
- **Run Time**: Fast (milliseconds)
- **Prevents**:
  - `utils/` importing from `~astro-utils/*` (breaks CLI tools)
  - Duplicated business logic between layers
  - Boundary violations that create circular dependencies

#### 3. CLI Integration Tests (`tests/tools/`)
- **Purpose**: Verify CLI tools work end-to-end without import errors
- **Scope**: Tool execution, help commands, basic functionality
- **Run Time**: Slow (seconds) - spawns actual processes
- **Prevents**:
  - `astro:` protocol errors in Node.js tools
  - Import chain issues that break downstream repos
  - Tool regressions from architectural changes

**Key Feature**: These tests would have caught the word-adding regression immediately by detecting the `astro:` protocol error during import.

### Test Patterns
- **Unit Testing**: Isolated function testing with Vitest
- **Integration Testing**: CLI tools tested via spawn for realistic execution
- **Architecture Testing**: Static analysis of import dependencies
- **Mock Data**: Controlled test data for consistent results
- **Type Safety**: TypeScript-first testing approach
- **Error Handling**: Comprehensive error condition testing

### Running Tests
```bash
npm test              # Run all tests with coverage (~10s)
npm run test:watch    # Watch mode for development
npm run lint          # oxlint code style checking
npm run typecheck     # TypeScript validation
npx astro check       # Astro-specific type checking
```

**Pre-commit hooks automatically:**
- Run linting with auto-fix on staged files
- Run tests for changed files only (fast, no coverage)

### Coverage Thresholds

Tests include coverage by default with enforced thresholds:
- **Lines**: 80% (current: ~84%)
- **Functions**: 75% (current: ~80%)
- **Branches**: 85% (current: ~89%)
- **Statements**: 80% (current: ~84%)

**What's excluded from coverage:**
- Build-time utilities (`static-file-utils.ts`, `static-paths-utils.ts`) - validated by build
- API routes (`src/pages/**`) - validated by build
- CLI tools (`tools/**`) - tested via integration tests
- Content config (`src/content.config.ts`) - build-time only

Coverage reports: `coverage/index.html`

### Performance

- **Total test time**: ~10 seconds
- **404 tests** across unit, architecture, and integration layers
- Pre-commit only tests changed files for fast feedback

### Regression Prevention

The test suite is specifically designed to prevent the types of regressions that have occurred:

**Regression: Word Adding Broke (2025-11)**
- **Cause**: `utils/page-metadata-utils.ts` imported from `~astro-utils/*`
- **Error**: `astro:` protocol not supported in Node.js CLI tools
- **Prevention**:
  - `tests/architecture/utils-boundary.spec.js` detects astro imports in utils/
  - `tests/tools/cli-integration.spec.js` catches import errors during tool execution
  - Both tests fail immediately if regression is reintroduced

**How to Add Regression Tests:**
1. Identify the root cause (e.g., incorrect import, duplication)
2. Add a test in appropriate layer (unit/architecture/integration)
3. Verify test fails with the bug present
4. Verify test passes with the fix applied
5. Document the regression in test comments

## Content Collections Deep Dive

### Configuration (`src/content.config.ts`)
```typescript
import { defineCollection, glob } from 'astro:content';

export const collections = {
  words: defineCollection({
    loader: glob({ 
      pattern: '**/*.json', 
      base: __WORD_DATA_PATH__ 
    })
  })
};
```

### Usage Patterns
```typescript
// In Astro components
import { getCollection } from 'astro:content';

const words = await getCollection('words');
const sortedWords = words
  .sort((a, b) => b.data.date.localeCompare(a.data.date));
```

### Build-time Path Injection
- `__WORD_DATA_PATH__`: Injected at build time via `astro.config.mjs`
- Supports different data sources via `{SOURCE_DIR}` environment variable
- Enables flexible deployment to different environments

## Complex Algorithms & Architectural Decisions

### Statistics Generation
Word statistics are derived from raw word data using specialized helpers in `src/utils/word-stats-utils.ts`. Functions such as `getCurrentStreakStats` and `getChronologicalMilestones` walk the dataset to compute streaks, letter patterns and milestone words without mutating the source array. These algorithms favor readability and immutability while still handling large word lists efficiently.

### Dynamic Static Path Creation
The `generateStatsStaticPaths` utility builds Astro static paths based on available statistics. It loads all words at runtime, filters out empty stat pages when the `__SHOW_EMPTY_STATS__` flag is disabled and maps each stat definition to its route and data payload. This ensures only meaningful pages are generated and keeps the build output lean.

### Page Metadata Caching
The `getPageMetadata` helper provides a single source of page titles and descriptions for both Astro pages and Node.js tools. Because Node scripts cannot read Astro frontmatter, metadata is defined in one place and cached after the initial computation. This avoids repeated statistics calculations and keeps build performance predictable.

## Performance Optimizations

### Build-time Optimizations
- **Static Pre-rendering**: All pages generated at build time
- **Content Collections Caching**: Automatic caching during development
- **Image Generation Batching**: Efficient bulk image processing
- **Bundle Splitting**: Astro's automatic code splitting

### Runtime Optimizations
- **Zero JavaScript**: Most pages load with no client-side JavaScript
- **Image Optimization**: Optimized PNG compression and sizing
- **CSS Minimization**: Automatic CSS optimization and inlining
- **Font Loading**: Efficient web font loading strategies

## Deployment & CI/CD

### GitHub Actions Integration
Tools designed to work seamlessly with GitHub Actions:

```yaml
- name: Add word
  run: npx tsx tools/add-word.ts ${{ github.event.inputs.word }}
  env:
    WORDNIK_API_KEY: ${{ secrets.WORDNIK_API_KEY }}
    SOURCE_DIR: ${{ vars.SOURCE_DIR }}
```

### Build Process
1. **Environment Validation**: Check required environment variables
2. **Content Loading**: Load word data via Content Collections
3. **Page Generation**: Generate all static pages and routes
4. **Image Processing**: Generate social sharing images
5. **Asset Optimization**: Optimize images, CSS, and other assets
6. **Deployment**: Deploy to GitHub Pages or other static hosts

## Accessibility Implementation

### Core Principles
- **Semantic HTML**: Proper heading hierarchy and landmark elements
- **Keyboard Navigation**: Full keyboard accessibility for all interactive elements
- **Screen Reader Support**: Descriptive labels and ARIA attributes
- **Color Contrast**: High contrast ratios for text readability
- **Focus Management**: Visible focus indicators

### Implementation Details
- **Skip Links**: Hidden navigation shortcuts for screen readers
- **Alt Text**: Descriptive alt text for all generated images
- **Language Attributes**: Proper lang attributes for pronunciation
- **Responsive Design**: Mobile-first approach with touch-friendly interactions

## Utility Architecture and Import Guidelines

### CLI vs Astro Separation

The project maintains a purposeful architectural separation between pure Node.js utilities and Astro-specific code to enable CLI tool independence and proper environment boundaries.

#### Root utils Directory - Pure Business Logic
Purpose: Environment-agnostic functions usable by both CLI tools and Astro components
Dependencies: Only Node.js built-ins and pure JavaScript libraries
Usage: CLI tools, tests, and shared business logic
Import Pattern: ~utils/text-utils (from TypeScript path mapping)

Files:
- date-utils.ts - Pure date manipulation functions
- text-utils.ts - String analysis and formatting functions
- word-stats-utils.ts - Statistics calculation algorithms
- word-data-utils.ts - Word filtering and data access utilities
- word-validation.ts - Data validation rules
- page-metadata-utils.ts - Core metadata generation logic
- url-utils.ts - URL generation helpers for routes

#### src/utils Directory - Astro-Specific Utilities
Purpose: Web application utilities that require Astro features
Dependencies: Astro Content Collections, framework-specific APIs, caching
Usage: Astro components, pages, and layouts only
Import Pattern: ~astro-utils/word-data-utils (from TypeScript path mapping)

Files:
- word-data-utils.ts - Astro Content Collection integration with caching
- word-stats-utils.ts - Enhanced stats with Astro-specific error handling
- page-metadata.ts - Astro wrapper for page metadata with BASE_PATH handling
- logger.ts, sentry.ts, image-utils.ts - Web app infrastructure

### Why This Separation Exists

1. CLI Tool Independence: CLI tools must work without Astro build system dependencies
2. Environment Boundaries: Different runtime environments require different utilities
3. Build Performance: Prevents unnecessary framework dependencies in CLI operations
4. Testing Clarity: Easier to unit test pure functions vs framework-dependent code

### Import Guidelines

Correct Usage:
```typescript
// In CLI tools (tools/*)
import { formatDate } from '~utils/date-utils';

// In Astro components (src/*)
import { getWordsFromCollection } from '~astro-utils/word-data-utils';
import { formatDate } from '~utils/date-utils'; // Also valid - pure functions
```

Incorrect Usage:
```typescript
// In CLI tools - NEVER import Astro-specific utilities
import { getWordsFromCollection } from '~astro-utils/word-data-utils'; // ERROR

// In utils/* - NEVER import ~astro-utils/* (breaks CLI tools)
import { getWordsByLetter } from '~astro-utils/word-data-utils'; // ERROR

// In Astro components - Avoid when Astro-specific alternative exists
import { getAvailableYears } from '~utils/word-data-utils'; // Use ~astro-utils version instead
```

### Import Boundary Rule for utils/ Directory

Files in `utils/` are shared between CLI tools and Astro. They must remain Astro-independent:

**Allowed imports:** `~utils/*`, `~types/*`, `~constants/*`, Node.js built-ins, pure npm packages
**Forbidden imports:** `~astro-utils/*`, `~src/*`, `astro:*` (triggers astro:content loader, breaks CLI)

**Solution when needing shared functionality:**

CORRECT Pattern (DRY - No Duplication):
```typescript
// utils/word-data-utils.ts - Pure function, single source of truth
export const getWordsByLength = (length: number, words: WordData[]): WordData[] => {
  return words.filter(word => word.word.length === length);
};

// src/utils/word-data-utils.ts - Thin wrapper with cached default
import { getWordsByLength as getWordsByLengthPure } from '~utils/word-data-utils';
export const allWords = await getAllWords(); // Cached from Astro Collections

export const getWordsByLength = (length: number, words: WordData[] = allWords): WordData[] => {
  return getWordsByLengthPure(length, words); // Delegate to pure function
};

// tools/add-word.ts - CLI tool imports pure function
import { getWordsByLength } from '~utils/word-data-utils';
const fiveLetterWords = getWordsByLength(5, myWords);

// src/pages/stats.astro - Astro page uses cached version
import { getWordsByLength } from '~astro-utils/word-data-utils';
const fiveLetterWords = getWordsByLength(5); // Uses cached allWords by default
```

WRONG Pattern (Duplicates Logic):
```typescript
// utils/word-data-utils.ts
export const getWordsByLength = (length, words) => {
  return words.filter(word => word.word.length === length); // Logic here
};

// src/utils/word-data-utils.ts - WRONG: Duplicates the filtering logic!
export const getWordsByLength = (length, words = allWords) => {
  return words.filter(word => word.word.length === length); // DUPLICATE!
};
```

**Enforcement:** Architecture tests in `tests/architecture/utils-boundary.spec.js` automatically detect and prevent these violations.

### Validation of Duplication Claims

What external audits may perceive as duplication is actually legitimate architectural separation:

- Different Interfaces: utils/word-data-utils.ts uses simple arrays, src/utils/word-data-utils.ts uses Astro Collections
- Different Error Handling: Root utils use basic console logging, Astro utils use structured logging and Sentry
- Different Performance: Root utils are synchronous, Astro utils include caching and async operations
- Different Dependencies: Root utils avoid framework deps, Astro utils leverage framework features

This separation should not be consolidated as it serves legitimate architectural purposes and follows Astro best practices.

## Recent Architecture Changes

### Tool Consolidation (January 2025)
- **Unified Image Generation**: Merged separate single/bulk tools into `generate-images.ts`
- **Shared Help System**: Created `tools/help-utils.ts` for consistent documentation
- **Environment Variable Support**: Tools work with manual env passing for CI/CD
- **DRY Improvements**: Eliminated code duplication across tools

### Content Collections Migration
- **Astro 5.0 Upgrade**: Migrated to new Content Layer API
- **Build-time Path Injection**: Dynamic path configuration via `astro.config.mjs`
- **Type Safety**: Full TypeScript support for content data
- **Caching**: Improved development experience with automatic caching

### Utility Reorganization
- **Shared Utils**: Created `utils/` directory for environment-agnostic functions
- **Environment Separation**: Clear separation between Astro and Node.js utilities
- **Import Cleanup**: Removed anti-pattern re-exports, direct imports only

## Development Workflow

### Getting Started
1. **Read Documentation**: Always start with README.md and this technical guide
2. **Environment Setup**: Copy `.env.example` to `.env` and configure
3. **Dependency Installation**: Run `npm install`
4. **Development Server**: Start with `npm run dev`

### Making Changes
1. **Todo Tracking**: Use TodoWrite tool for multi-step tasks
2. **Follow Patterns**: Check similar files for architectural patterns
3. **Type Safety**: Ensure TypeScript compliance throughout
4. **Testing**: Run `npm run lint` and `npm run typecheck` after changes
5. **Build Verification**: Test with `npm run build` before committing

### Code Style Guidelines
- **Immutable Declarations**: Use `const` only, avoid `let` and `var`
- **Fast-fail Validation**: Early returns, avoid nested conditions
- **Modern ES6+**: Destructuring, arrow functions, template literals
- **Error Handling**: Structured logging with message + data object format
- **TypeScript First**: Leverage type system for code safety

## Constraints & Limitations

### Technical Constraints
- **Static Generation Only**: No real-time updates, changes require rebuilds
- **Single Word Per Date**: Each date can only have one associated word
- **Unique Words**: Each word can only be used once across all dates
- **Past/Present Only**: Future dates not supported for word scheduling

### Design Constraints
- **Family-friendly**: Educational tone, avoid possessive language
- **Performance First**: Optimize for build-time over runtime complexity
- **Accessibility Required**: WCAG AA compliance mandatory
- **Mobile First**: Responsive design for all screen sizes