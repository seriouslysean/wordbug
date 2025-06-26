# CLAUDE.md - WordBug Project Context

> **For Claude Code**: This file contains comprehensive project context and implementation details. Always read this file and the documentation in `docs/README.md` before working on the project.

## Project Overview

**WordBug** is an educational vocabulary site featuring words that Jacob Kennedy (Sean's son) thinks are cool. Built with Astro as a static site generator, it showcases daily word definitions from Wordnik with rich content including pronunciation, etymology, and cross-references.

- **Live Site**: https://wordbug.fyi
- **Purpose**: Educational vocabulary tool and historical word archive
- **Architecture**: Static site with modern SEO, adapter pattern for APIs
- **Content**: JSON-based word storage with automated workflows

## Key Project Principles

1. **DRY (Don't Repeat Yourself)**: All duplicate code has been eliminated
2. **Environment-Driven**: No hardcoded values, everything uses environment variables
3. **Adapter Pattern**: Modular API integration (currently Wordnik, extensible)
4. **SEO-First**: Comprehensive SEO with structured data and social sharing
5. **Accessibility**: WCAG compliant with proper ARIA labels
6. **Performance**: Static generation with optimized loading

## Architecture Overview

### Core Technology Stack
- **Framework**: Astro (static site generator)
- **Styling**: Modern CSS with variables, responsive design
- **Data Source**: Wordnik API via adapter pattern
- **Deployment**: GitHub Actions workflow
- **Testing**: Vitest

### Directory Structure
```
src/
├── adapters/           # API adapters (Wordnik, extensible to other dictionaries)
├── components/         # Reusable UI components (Header, Footer, Word, etc.)
├── config/            # Centralized configuration (SEO, environment variables)
├── data/              # Word data JSON files (YYYYMMDD format)
├── layouts/           # Page layouts (main Layout.astro)
├── pages/             # Astro pages and routing ([word].astro, index.astro, etc.)
├── styles/            # Global CSS and CSS variables
└── utils/             # Utility functions (word-utils, date-utils, api-utils, etc.)

tools/                 # Build and automation scripts
public/                # Static assets (favicon, robots.txt, humans.txt)
docs/                  # Project documentation
```

## Recent Major Implementation Work

### 1. DRY Code Improvements (Completed)
**Problem**: Duplicate functions across multiple files
**Solution**: Consolidated and centralized common functions

- **Removed duplicate `formatDate`** from `PastWords.astro`, now imports from `date-utils`
- **Consolidated `sanitizeHTML`** functions into single implementation in `api-utils.js`
- **Removed duplicate `getWordDetails`** from `api-utils.js`, now uses adapter pattern
- **Added missing CSS variables**: `--font-size-xs: 0.75rem`, `--content-width-large: min(1200px, 90vw)`

### 2. Adapter Pattern Implementation (Completed)
**Problem**: Tight coupling to Wordnik API, no extensibility
**Solution**: Functional adapter pattern for API abstraction

**Key Files**:
- `src/adapters/wordnik.js` - Wordnik adapter with cross-reference processing
- `src/utils/word-utils.js` - Simplified to use adapter directly

**Key Functions**:
- `processCrossReferences()` - Converts `<xref>word</xref>` to Wordnik links
- `transformExistingWordData()` - Handles legacy and current word formats
- `getWordDetails()` - Now uses adapter: `return transformExistingWordData(word);`

### 3. Cross-Reference Link Enhancement (Completed)
**Problem**: Wordnik xrefs were being stripped instead of linked
**Solution**: Enhanced `sanitizeHTML` with xref processing

- Added `preserveXrefs` parameter to `sanitizeHTML` function
- Cross-references now link back to Wordnik: `<xref>word</xref>` → `<a href="https://wordnik.com/words/word" class="xref-link">word</a>`
- Added CSS styling for xref links with dotted underlines

### 4. Comprehensive SEO Implementation (Completed)
**Problem**: Basic SEO, missing modern best practices
**Solution**: Environment-driven SEO configuration with structured data

**Key Files**:
- `src/config/seo.js` - Centralized SEO configuration
- `src/layouts/Layout.astro` - Enhanced with comprehensive meta tags
- `src/pages/[word].astro` - Word-specific SEO data generation

**SEO Features Implemented**:
- **Canonical URLs**: Proper canonicalization with environment-driven base URLs
- **Hreflang**: Language and internationalization support
- **Meta Descriptions**: Dynamic, word-specific descriptions (150 char limit)
- **JSON-LD Structured Data**: Schema.org `DefinedTerm` vocabulary
- **OpenGraph/Twitter Cards**: Social media sharing optimization
- **Humans.txt**: Proper web standards format with contributor credits
- **Robots.txt**: Standard crawling permissions with sitemap reference

### 5. Environment Variable Configuration (Completed)
**Problem**: Hardcoded values throughout codebase
**Solution**: All configuration now uses `import.meta.env` with fallbacks

**Key Environment Variables**:
```bash
SITE_URL=https://wordbug.fyi
SITE_TITLE="Bug's (Occasional) Word of the Day"
SITE_DESCRIPTION="Educational vocabulary site..."
SITE_NAME=WordBug
SITE_LOCALE=en-US
SITE_AUTHOR="Sean Kennedy & Jacob Kennedy"
SITE_KEYWORDS="vocabulary,word of the day,education,learning,dictionary,definitions"
WORDNIK_API_KEY=your_api_key_here
```

## Critical Implementation Details

### Word Data Format
Words are stored as JSON files in `src/data/words/YYYYMMDD/word.json`:

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

### Cross-Reference Processing
The Wordnik adapter processes inline cross-references:
- **Input**: `This is an <xref>example</xref> of usage.`
- **Output**: `This is an <a href="https://wordnik.com/words/example" class="xref-link">example</a> of usage.`

### SEO Schema Implementation
Each word page includes structured data following Schema.org DefinedTerm:

```json
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm", 
  "name": "example",
  "description": "Definition text...",
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "WordBug"
  }
}
```

## Development Workflow

### Adding New Words
Use the interactive tool:
```bash
npm run tool:add-word
```

### Testing and Building
```bash
npm run test          # Run tests
npm run build         # Build for production
npm run preview       # Preview production build
```

### Key Scripts
- `npm run dev` - Development server
- `npm run tool:add-word` - Interactive word addition
- `npm run tool:generate-word-data` - Batch word data generation
- `npm run tool:generate-all-images` - Generate social media images

## Code Patterns and Conventions

### Component Structure
- **Astro Components**: Use `.astro` extension, follow component-scoped styling
- **TypeScript**: Interface definitions for props and data structures
- **CSS**: Use CSS variables, follow BEM-like naming for classes
- **Imports**: Use path aliases (`~components/`, `~utils/`, `~config/`)

### Function Patterns
- **Utilities**: Pure functions with clear input/output
- **Adapters**: Functional approach, no classes unless necessary
- **Error Handling**: Graceful fallbacks, never break the build
- **Environment Variables**: Always provide fallbacks using `||` operator

### File Naming
- **Components**: PascalCase (e.g., `WordComponent.astro`)
- **Utilities**: kebab-case (e.g., `word-utils.js`)
- **Data Files**: YYYYMMDD format (e.g., `20240101/example.json`)

## Testing and Quality Assurance

### Test Coverage
- Unit tests for utility functions
- Integration tests for word processing
- Build tests for static generation

### Code Quality
- No linting errors (run build to verify)
- No TypeScript errors
- Accessibility compliance (WCAG)
- Performance optimization (static generation)

## Deployment and Operations

### GitHub Actions Workflow
1. **Trigger**: Push to main branch
2. **Build**: Static site generation
3. **Test**: Run test suite
4. **Images**: Generate social media images
5. **Deploy**: Push to hosting platform
6. **Post-Deploy**: Update sitemaps

### Monitoring
- Build status via GitHub Actions
- Site performance monitoring
- SEO monitoring (structured data validation)

## Contributors and Roles

- **Jacob Kennedy**: Word Curator (selects the cool words)
- **Sean Kennedy**: Developer and Site Architect
- **Wordnik**: Dictionary data provider

## Important Implementation Notes

### What NOT to Change
- **Existing word data structure** - Maintains backward compatibility
- **URL patterns** - SEO and link preservation
- **CSS variable names** - Used throughout the application
- **Environment variable names** - Standardized across deployment

### Best Practices When Modifying
1. **Always test builds** - Run `npm run build` before committing
2. **Preserve existing functionality** - Don't break word display or navigation
3. **Follow environment variable pattern** - Use `import.meta.env` with fallbacks
4. **Maintain adapter abstraction** - Keep API calls within adapters
5. **Update documentation** - Keep this file and README current

### Common Gotchas
- **Astro imports**: Use proper import patterns for components
- **Environment variables**: Available only in server context, not client
- **Static generation**: Pages must be deterministic at build time
- **Cross-references**: Must be processed by adapter, not stripped

## Future Extensibility

### Planned Enhancements
- **Multiple Dictionary Support**: Additional adapters beyond Wordnik
- **Search Functionality**: Full-text search across word archive
- **User Features**: Favorites, sharing, personalization
- **Analytics**: Usage tracking and popular words

### Architecture Support
The current adapter pattern and environment-variable driven configuration supports:
- Easy API swapping
- Multi-language support (hreflang already implemented)
- Theme customization (CSS variables ready)
- Content management system integration

---

**Last Updated**: 2025-06-26
**Claude Code Instructions**: Always read this file first, then check `docs/README.md` for current project documentation. Follow established patterns and maintain backward compatibility.