# occasional-wotd

A modern, family-friendly word-of-the-day site generator that powers [wordbug.fyi](https://wordbug.fyi) and [wordbun.fyi](https://wordbun.fyi).

```
    o    o
     \__/
     /oo\
     \()/
     |~~|
     |~~|
     |~~|               /\
     \~~\              /\/
      \~~\____________/\/
       \/ | | | | | | \/
        ~~~~~~~~~~~~~~~
```

## Features

- **📚 Rich Word Data**: Powered by Wordnik API with comprehensive definitions
- **📊 Smart Statistics**: Letter patterns, word endings, reading streaks, and linguistic analysis
- **🖼️ Social Images**: Automated generation of beautiful, shareable word graphics
- **🚀 Lightning Fast**: Static site generation with Astro for optimal performance
- **🎨 Customizable**: Environment-based theming and multi-source data support
- **♿ Accessible**: WCAG compliant with keyboard navigation and screen reader support

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
npm run tool:local tools/add-word.ts serendipity

# Add word for specific date
npm run tool:local tools/add-word.ts ephemeral 20250130

# Generate social images
npm run tool:local tools/generate-images.ts

# Get help for any tool
npm run tool:local tools/add-word.ts --help
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
COLOR_PRIMARY="#b45309"
COLOR_PRIMARY_LIGHT="#d97706"
COLOR_PRIMARY_DARK="#78350f"
```

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
npm test              # Run all tests
npm run typecheck     # TypeScript validation
npm run lint          # Code style checking
```

## Technology

- **[Astro](https://astro.build/)** - Static site generator
- **[Wordnik API](https://wordnik.com/)** - Dictionary definitions
- **[Sharp](https://sharp.pixelplumbing.com/)** - Image generation
- **[Vitest](https://vitest.dev/)** - Testing framework

## Documentation

- **[Technical Guide](docs/technical.md)** - Architecture, tools, and implementation details
- **[Feature Ideas](docs/potential-features.md)** - Planned enhancements and improvements

## License

MIT License - see [LICENSE.md](LICENSE.md) for details.