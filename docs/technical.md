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
├── utils/                   # Client/Astro utilities (20+ files)
├── config/
│   └── site-config.ts       # Site configuration
├── styles/                  # CSS files
└── assets/                  # Static assets

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
├── adapters.ts             # Dictionary adapter config
├── environment.ts          # Environment variable handling
└── paths.ts                # Path configuration

types/                       # Shared type definitions (12 files)
├── adapters.ts             # Dictionary API types
├── config.ts               # Configuration types
├── tools.ts                # Tool-specific types
├── word.ts                 # Word data structures
├── stats.ts                # Statistics types
├── schema.ts               # Schema types
├── seo.ts                  # SEO types
├── utils.ts                # Utility types
├── vite.d.ts               # Vite definitions
├── window.d.ts             # Window extensions
├── wordnik.ts              # Wordnik API types
└── opentype.js.d.ts        # OpenType.js definitions

adapters/                    # Dictionary API adapters  
├── factory.ts              # Adapter factory
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
├── tools/                  # CLI tool tests
├── utils/                  # Utility function tests
└── src/utils/              # Astro-specific utility tests
```

### Test Patterns
- **Unit Testing**: Isolated function testing with Vitest
- **Mock Data**: Controlled test data for consistent results
- **Type Safety**: TypeScript-first testing approach
- **Error Handling**: Comprehensive error condition testing

### Running Tests
```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run typecheck           # TypeScript validation
npm run lint                # ESLint checking
```

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