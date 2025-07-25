# Technical Overview

## Tech Stack

- **Framework**: [Astro](https://astro.build/) - Static site generator
- **Runtime**: Node.js 20+
- **Package Manager**: npm
- **Testing**: [Vitest](https://vitest.dev/)
- **Linting**: ESLint with TypeScript support
- **Image Processing**: Sharp with OpenType.js for SVG text rendering

## Architecture

### Static Generation
- Site is statically generated at build time
- Deployed to GitHub Pages
- Updates only when code changes are pushed to main branch

### Data Structure
- Words stored as JSON files in `data/words/{year}/{YYYYMMDD}.json`
- Each word file contains:
  - `word`: lowercase word string
  - `date`: YYYYMMDD format
  - `data`: Array of Wordnik API response objects

### Key Components
- **Pages**: Dynamic routes for words, dates, and stats
- **Word Management**: CLI tools for adding words and generating images
- **API Integration**: Wordnik API for word definitions
- **Image Generation**: Programmatic SVG/PNG creation for social sharing

## Development Workflow

### Adding Words
1. Use `npm run tool:add-word` or GitHub Actions workflow
2. Tool validates word doesn't already exist
3. Tool validates date isn't in the future
4. Fetches definition from Wordnik API
5. Generates social sharing image
6. Creates JSON file in appropriate year directory

### Validation Rules
- **Date Validation**: Cannot add words for future dates
- **Duplicate Prevention**: Words cannot be added multiple times across any date
- **Dictionary Validation**: Words must exist in Wordnik dictionary

### Build Process
1. Astro builds static site from word data
2. Generates pages for each word and date
3. Creates aggregated views (stats, yearly lists)
4. Optimizes images and assets
5. Deploys to GitHub Pages

## Theme Configuration

The theme system supports optional project-level customization:

### Default Theme
- Base theme located at `config/theme.js`
- Includes colors, fonts, spacing, and other design tokens
- Used for both CSS variables and image generation

### Project Overrides
- Create `theme.config.js` at project root to override defaults
- Only override the values you want to change
- Example:
  ```js
  // theme.config.js
  export const colors = {
    primary: '#ef4444',
    accent: '#22c55e'
  }
  ```
- File is project-specific and not committed to template

## Environment Variables

All configuration uses environment variables:
- `WORDNIK_API_KEY`: Required for word definitions
- `SITE_*`: Site metadata (title, description, etc.)
- `SENTRY_*`: Error tracking configuration

## Testing

- Unit tests with Vitest
- Test coverage for validation logic
- API adapter tests with mocked responses
- Utility function tests

## File Structure

```
src/
├── data/words/           # Word data files by year
├── pages/               # Astro page routes
├── components/          # Reusable Astro components
├── utils/               # Utility functions
├── types/               # TypeScript type definitions
└── adapters/            # External API adapters

tools/                   # CLI tools for word management
tests/                   # Test suites
public/                  # Static assets including generated images
```

## URL and Link Management

### Consistent URL Generation
- **All internal links** use the `SiteLink` component which has `getUrl()` built-in
- **Import directly** from `~utils/url-utils` instead of deprecated re-export files
- **No hardcoded URLs** - always use `SiteLink` for consistency across base path configurations

### Component Guidelines
- `SiteLink`: Use for all internal navigation (replaces raw `<a>` tags)
- `WordLink`: Specialized component for word-to-word navigation with date display
- `SectionHeading`: Page section headers with optional navigation links

## Stats Pages Architecture

### Current Implementation
- Individual `.astro` files for each stats category (alphabetical-order, double-letters, etc.)
- Shared `StatsWordListPage` component template for consistent layout
- Conditional page generation via `getStaticPaths()` based on `__SHOW_EMPTY_STATS__` environment variable

### New Streak Pages (Added)
- `/stats/current-streak`: Shows words from active consecutive streak
- `/stats/longest-streak`: Shows words from historical longest streak
- Both use milestone-style template with day-by-day breakdown

### Stats Page Generation
```javascript
// Pattern for conditional stats page generation
export async function getStaticPaths() {
  const words = getAllWords();
  const statsData = getStatsFunction(words);
  
  const showEmptyPages = __SHOW_EMPTY_STATS__;
  return (showEmptyPages || statsData.length > 0) ? [{}] : [];
}
```

## Code Organization Best Practices

### Import Guidelines
- **Avoid re-export files** - Import directly from specific utility files
- **Use dedicated utils** - `url-utils.ts`, `text-utils.ts`, `word-stats-utils.ts`, etc.
- **No barrel exports** - Deprecated pattern that makes dependency tracking harder

### Performance Optimizations
- **Build-time caching** - Word data cached during static generation
- **Shared computations** - Expensive stats calculations shared where possible
- **Conditional generation** - Empty pages only generate in development mode

## Homepage Logic

### Word Display Strategy
- **Current word**: Most recent word ≤ today's date
- **Previous words**: Last 5 words excluding current (simplified from complex month-based logic)
- **Demo data fallback**: Graceful handling when no production data exists

```javascript
// Simplified homepage word logic
const currentWord = getCurrentWord();
const allWords = getAllWords();
const wordsToShow = allWords
  .filter(word => word && word.word !== currentWord?.word)
  .slice(0, 5);
```

## Recent Architectural Improvements

### URL Consistency (Fixed)
- Standardized all internal links to use `SiteLink` component  
- Eliminated mixed `getUrl()` usage patterns
- Updated `SectionHeading` component to use `SiteLink` instead of raw `<a>` tags
- Fixed imports from deprecated re-export files to direct utility imports

### Homepage Previous Words (Fixed)
- Simplified complex month-based filtering logic
- Fixed issue where no previous words were showing with demo data
- Now displays last 5 words excluding current word

### Stats Page Infrastructure (Completed)
- Added conditional page generation for empty stats
- Implemented new streak stats pages with milestone-style layouts
- Fixed page metadata for SEO consistency

### Upcoming Optimizations (Identified)
- **Stats page consolidation**: Replace 6 individual pages with single dynamic route
- **Pre-computed stats system**: Cache expensive calculations at build time  
- **Tools/Astro code unification**: Resolve duplicate word loading logic

## Key Constraints

- **No Real-time Updates**: Site only updates on deployment
- **Single Word Per Date**: Each date can only have one word
- **Unique Words**: Each word can only be used once across all dates
- **Past/Present Only**: Words cannot be scheduled for future dates
- **Kid-friendly language**: Avoid possessive language ("your"), use educational tone
- **Low-JS approach**: All JavaScript in frontmatter for build-time pre-computation
- **KISS & DRY principles**: Keep it simple, don't repeat yourself
- **Performance first**: Optimize for build-time over runtime (static generation)
