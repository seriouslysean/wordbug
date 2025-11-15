# occasional-wotd

A modern, family-friendly word-of-the-day site generator template for creating occasional vocabulary learning sites.

```
                ██     ██  ██████  ██████  ██████
                ██     ██ ██    ██ ██   ██ ██   ██
                ██  █  ██ ██    ██ ██████  ██   ██
                ██ ███ ██ ██    ██ ██   ██ ██   ██
                 ███ ███   ██████  ██   ██ ██████


 ██████  ███████     ████████ ██   ██ ███████     ██████   █████  ██    ██
██    ██ ██             ██    ██   ██ ██          ██   ██ ██   ██  ██  ██
██    ██ █████          ██    ███████ █████       ██   ██ ███████   ████
██    ██ ██             ██    ██   ██ ██          ██   ██ ██   ██    ██
 ██████  ██             ██    ██   ██ ███████     ██████  ██   ██    ██


```

A template for creating family word-of-the-day sites that provides a foundation for showcasing interesting words and serving as a historical reference.

## Features

- **Rich Word Data**: Powered by Wordnik API with comprehensive definitions
- **Smart Statistics**: Letter patterns, word endings, reading streaks, and linguistic analysis
- **Social Images**: Automated generation of beautiful, shareable word graphics
- **Lightning Fast**: Static site generation with Astro for optimal performance
- **Customizable**: Environment-based theming and multi-source data support
- **Accessible**: WCAG compliant with keyboard navigation and screen reader support

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your Wordnik API key to .env

# Start development
npm run dev

# Build for production
npm run build
```

## Adding Words

```bash
# Add a word for today
npm run tool:local -- tools/add-word.ts serendipity

# Add word for specific date
npm run tool:local -- tools/add-word.ts ephemeral 20250130

# Generate social images
npm run tool:local -- tools/generate-images.ts

# Get help for any tool
npm run tool:local -- tools/add-word.ts --help
```

## Configuration

Control your site through environment variables:

```bash
# Site Identity
SITE_TITLE="My Word Site"
SITE_URL="https://my-word-site.com"
SOURCE_DIR="words"                      # Data source (demo, words, etc.)

# Dictionary Service
DICTIONARY_ADAPTER="wordnik"
WORDNIK_API_KEY="your-api-key-here"

# Colors (optional)
COLOR_PRIMARY="#9a3412"
COLOR_PRIMARY_LIGHT="#c2410c"
COLOR_PRIMARY_DARK="#7c2d12"
```

## Deployment

The site supports both root and subdirectory deployments:

### Root Deployment
```bash
SITE_URL="https://example.com"
BASE_PATH="/"
```

### Subdirectory Deployment
```bash
SITE_URL="https://example.com"    # Domain only
BASE_PATH="/vocab"                # Subdirectory path
```

### Popular Platforms
```bash
# Netlify/Vercel (root)
SITE_URL="https://mysite.netlify.app"
BASE_PATH="/"

# GitHub Pages (subdirectory) 
SITE_URL="https://username.github.io"
BASE_PATH="/repo-name"

# Custom subdirectory
SITE_URL="https://mysite.com"
BASE_PATH="/words"
```

**Important**: The site's URL utilities automatically handle BASE_PATH for all internal links and absolute URLs. Never hardcode paths.

## Data Structure

Words are stored as JSON files organized by year:

```
data/
└── {SOURCE_DIR}/
    └── words/
        └── 2025/
            ├── 20250101.json
            ├── 20250102.json 
            └── ...
```

Each word file contains the word, date, and rich definition data from your chosen dictionary service.

## Testing

```bash
# Run all tests (unit + architecture + integration)
npm test

# Run specific test suites (faster iteration)
npm run test:unit          # Fast unit tests only (~5s)
npm run test:integration   # Slow CLI integration tests (~6s)
npm run test:arch          # Architecture boundary tests (<1s)

# Coverage and validation
npm run test:coverage        # Generate coverage report
npm run test:coverage-check  # Enforce 80% threshold (fails CI if below)

# Code quality
npm run lint          # Code style checking (oxlint)
npm run typecheck     # TypeScript validation (tsc)
npx astro check       # Astro-specific type checking
```

### Testing Quick Start

**Before committing code:**
```bash
npm run lint && npm test && npx astro check
```

**When modifying CLI tools:**
```bash
npm run test:integration  # Verify tools load without errors
```

**When changing architecture:**
```bash
npm run test:arch  # Verify import boundaries
```

See [Technical Guide - Testing Strategy](technical.md#testing-strategy) for details.

## Technology

- **[Astro](https://astro.build/)** - Static site generator
- **[Wordnik API](https://wordnik.com/)** - Dictionary definitions
- **[Sharp](https://sharp.pixelplumbing.com/)** - Image generation
- **[Vitest](https://vitest.dev/)** - Testing framework
- **[GitHub Pages](https://pages.github.com/)** - Hosting platform
- **[Sentry](https://sentry.io/)** - Error monitoring

## Documentation

- **[Technical Guide](technical.md)** - Architecture, tools, and implementation details
- **[Improvements Backlog](improvements-backlog.md)** - Technical gaps and implementation opportunities

## License

MIT License - see [LICENSE.md](../LICENSE.md) for details.