# WordBug - Technical Documentation

This document contains technical information for developers working on WordBug.

## Architecture

Built with **Astro** as a static site generator, leveraging:

- **Adapter Pattern**: Modular API integration (currently Wordnik, extensible to other dictionaries)
- **Environment-Driven**: All configuration via environment variables
- **Component-Based**: Reusable Astro components following DRY principles
- **Static Generation**: Fast, SEO-friendly static pages with optional dynamic features
- **Modern CSS**: CSS variables, responsive design, and accessibility best practices

## Project Structure

```
src/
├── adapters/           # API adapters (Wordnik, extensible)
├── components/         # Reusable UI components
├── config/            # Centralized configuration (SEO, etc.)
├── data/              # Word data JSON files
├── layouts/           # Page layouts
├── pages/             # Astro pages and routing
├── styles/            # Global CSS and variables
└── utils/             # Utility functions and helpers

tools/                 # Build and automation scripts
public/                # Static assets
docs/                  # Documentation
```

## Development Setup

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/seriouslysean/wordbug.git
cd wordbug

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Wordnik API key and site configuration

# Start development server
npm run dev
```

### Environment Variables

Key environment variables (see `.env.example`):

- `WORDNIK_API_KEY`: Your Wordnik API key
- `SITE_URL`: Production site URL (e.g., https://wordbug.fyi)
- `SITE_TITLE`: Site title for SEO
- `SITE_DESCRIPTION`: Site description for SEO
- `SITE_NAME`: Short site name
- `SITE_LOCALE`: Site locale (e.g., en-US)
- `SITE_AUTHOR`: Author information
- `SITE_KEYWORDS`: Comma-separated keywords

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run tool:add-word` - Add a new word (interactive)
- `npm run tool:generate-word-data` - Generate word data
- `npm run tool:generate-all-images` - Generate social media images

## Content Management

### Word Data Structure

Words are stored as JSON files in `src/data/words/YYYYMMDD/` with the following structure:

```json
{
  "word": "example",
  "date": "20240101",
  "partOfSpeech": "noun",
  "definition": "A representative form or pattern...",
  "meta": {
    "sourceUrl": "https://wordnik.com/words/example",
    "attributionText": "Wordnik"
  }
}
```

### Adding Words

Use the interactive tool:

```bash
npm run tool:add-word
```

Or via GitHub Actions workflow (requires repository secrets setup).

## API Integration

### Wordnik Adapter

The project uses a functional adapter pattern for API integration. The Wordnik adapter (`src/adapters/wordnik.js`) handles:

- Cross-reference processing (`<xref>word</xref>` → links to Wordnik)
- Data transformation and sanitization
- Legacy format support

### Adding New Adapters

To add support for other dictionary APIs:

1. Create new adapter file in `src/adapters/`
2. Implement required functions: `processCrossReferences`, `transformExistingWordData`
3. Update word utilities to use new adapter

## SEO & Performance

### SEO Features

- **Structured Data**: Schema.org DefinedTerm vocabulary for word definitions
- **Meta Tags**: Comprehensive OpenGraph and Twitter Card support
- **Canonical URLs**: Proper canonicalization with hreflang
- **Sitemaps**: Auto-generated XML sitemaps
- **Performance**: Static generation ensures fast loading times
- **Accessibility**: WCAG compliant with proper ARIA labels

### Configuration

SEO configuration is centralized in `src/config/seo.js` and driven by environment variables.

## Testing

The project uses Vitest for testing:

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Deployment

### GitHub Actions

The site is deployed automatically via GitHub Actions on push to main branch. The workflow:

1. Builds the static site
2. Generates social media images
3. Deploys to hosting platform
4. Updates sitemaps

### Manual Deployment

```bash
# Build the site
npm run build

# Preview build locally
npm run preview

# Deploy dist/ folder to your hosting provider
```

## Code Standards

### File Naming Conventions

- **Components**: PascalCase (e.g., `WordComponent.astro`)
- **Utilities**: kebab-case (e.g., `word-utils.js`)
- **Data Files**: YYYYMMDD format (e.g., `20240101/example.json`)

### Code Style

- Use CSS variables for theming
- Follow BEM-like naming for CSS classes
- Use path aliases (`~components/`, `~utils/`, `~config/`)
- Pure functions with clear input/output
- Environment variables with fallbacks

### Import Patterns

```javascript
// Astro components
import Layout from '~layouts/Layout.astro';
import WordComponent from '~components/Word.astro';

// Utilities
import { formatDate } from '~utils/date-utils';
import { getWordDetails } from '~utils/word-utils';

// Configuration
import { seoConfig } from '~config/seo';
```

## Contributing

This is primarily a personal project, but contributions are welcome:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following existing code patterns
4. Run tests to ensure nothing breaks
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Submit a pull request

### Before Contributing

- Read the `CLAUDE.md` file for comprehensive project context
- Ensure all tests pass
- Follow the established code patterns
- Update documentation if needed

## Troubleshooting

### Common Issues

1. **Build fails with missing environment variables**: Copy `.env.example` to `.env` and fill in required values
2. **Wordnik API rate limit**: Check your API key and usage limits
3. **Missing word data**: Ensure word JSON files are properly formatted and in correct directory structure

### Getting Help

- Check existing issues on GitHub
- Review the `CLAUDE.md` file for detailed implementation context
- Ensure you're following the patterns described in this documentation

## License

MIT License - see LICENSE file for details.