# occasional-wotd

Template for family word-of-the-day sites.

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

A static site generator for creating word-of-the-day websites with rich statistics, social sharing, and multi-source data support.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Wordnik API key

# Start development server
npm run dev

# Build for production
npm run build
```

## Features

- **Multi-source Data**: Support for Wordnik API and local word files
- **Rich Statistics**: Letter patterns, word endings, and linguistic analysis
- **Social Images**: Automated generation of shareable word graphics
- **SEO Optimized**: Full metadata and OpenGraph support
- **Static Generation**: Fast, secure deployment to GitHub Pages
- **Configurable**: Environment-based configuration for different data sources

## Architecture

### Word Data Management
- Centralized loading with dependency injection pattern
- Support for both local and external data sources via `SOURCE_DIR`
- Single source of truth with the `allWords` constant

### Statistics Engine
- Comprehensive word analysis (letter frequency, patterns, etc.)
- Build-time computation for optimal performance
- Conditional page generation (skip empty stats in production)

### Social Image Generation
- SVG-to-PNG conversion with Sharp
- Automated image creation for each word
- Year and page-specific social graphics

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SOURCE_DIR` | Word data source directory | `""` (local data/words/) |
| `WORDNIK_API_KEY` | API key for word definitions | Required |
| `DICTIONARY_ADAPTER` | Dictionary service to use | `"wordnik"` |
| `SITE_TITLE` | Site title for metadata | `"Word of the Day"` |
| `SITE_URL` | Base URL for the site | Required for production |

### Data Sources

**Local Data** (`SOURCE_DIR=""`)
```
data/words/
├── 20250101.json
├── 20250102.json
└── ...
```

**External Data** (`SOURCE_DIR="2025"`)
```
../wordbun/data/words/2025/
├── 20250101.json
├── 20250102.json
└── ...
```

## Development

### Adding Words
```bash
# Add a word for today
npm run tool:add-word -- myword

# Add a word for specific date
npm run tool:add-word -- myword --date 20250130
```

### Generating Images
```bash
# Generate all word images
npm run tool:generate-word-images

# Generate static page images
npm run tool:generate-page-images
```

### Testing
```bash
# Run all tests
npm run test

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Deployment

The site uses GitHub Actions for automated deployment:

1. Push to `main` branch
2. GitHub Actions builds the site
3. Generates all social images
4. Deploys to GitHub Pages

## Documentation

- [Technical Overview](docs/technical.md) - Detailed architecture and implementation
- [Feature Ideas](docs/potential-features.md) - Future enhancement possibilities

## Technology Stack

- **Framework**: [Astro](https://astro.build/) - Static site generator
- **Runtime**: Node.js 20+
- **Image Processing**: Sharp with OpenType.js
- **Testing**: Vitest
- **Deployment**: GitHub Pages
- **Dictionary**: [Wordnik API](https://wordnik.com/)

## Recent Improvements

- Restructured word data loading with dependency injection
- Centralized word access through `allWords` constant
- Fixed all linting and TypeScript errors
- Enhanced test coverage with proper word data mocking
- Eliminated code duplication and anti-pattern re-exports
- Added comprehensive statistics pages with conditional generation

## License

MIT License - see [LICENSE.md](LICENSE.md) for details.