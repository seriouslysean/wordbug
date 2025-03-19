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

## Key Constraints

- **No Real-time Updates**: Site only updates on deployment
- **Single Word Per Date**: Each date can only have one word
- **Unique Words**: Each word can only be used once across all dates
- **Past/Present Only**: Words cannot be scheduled for future dates
