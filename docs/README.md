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

- **Rich Word Data**: Multi-adapter dictionary support (Merriam-Webster, Wordnik, Wiktionary) with automatic fallback
- **Smart Statistics**: Letter patterns, word endings, reading streaks, and linguistic analysis
- **Social Images**: Automated generation of beautiful, shareable word graphics
- **Lightning Fast**: Static site generation with Astro for optimal performance
- **Customizable**: Environment-based theming and multi-source data support
- **Accessible**: WCAG compliant with keyboard navigation and screen reader support

## Quick Start

Requires Node.js 26+ (`.nvmrc` provided).

```bash
# Install dependencies
nvm use && npm install

# Start development with the bundled demo words
SOURCE_DIR=demo npm run dev

# Build for production
SOURCE_DIR=demo npm run build
```

No `.env` is needed to run the demo. This repository only ships the demo words
(`data/demo/words/`), so `SOURCE_DIR=demo` is required here: without it the
site reads `data/words/`, finds no words, and the build fails with
`Word not found`. To add words you need a dictionary API key:

```bash
cp .env.example .env
# Set SOURCE_DIR=demo and add your dictionary API key in .env
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
SOURCE_DIR=""                           # Data subdirectory; unset reads data/words/, demo reads data/demo/words/

# Dictionary Service
DICTIONARY_ADAPTER="merriam-webster"
MERRIAM_WEBSTER_API_KEY="your-api-key-here"

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

## Starting a Site

A site is a full copy of this repository in a repository of its own. It adds its own words, runs the tools and the workflows itself, and takes each release by merging this repository's `main` with `npm run tool:sync` ([Downstream Sync](technical.md#downstream-sync)).

Start from a clone. A copy without this repository's history, such as a template copy or a downloaded ZIP, can never sync: the sync merges `upstream/main`, and Git refuses to merge histories that share no commit.

1. Create an empty repository on GitHub, with no README, license or `.gitignore`.
2. Clone the engine and make it the site's upstream:

   ```bash
   git clone https://github.com/seriouslysean/occasional-wotd.git my-site
   cd my-site
   git remote rename origin upstream
   git remote add origin git@github.com:YOUR-ACCOUNT/my-site.git
   nvm use && npm ci
   ```

3. In the new repository's **Settings**, before the first push:
   - **Secrets and variables > Actions > Variables**: `SITE_URL`, `SITE_TITLE`, `SITE_DESCRIPTION`, `SITE_ID` and `DICTIONARY_ADAPTER` (`wordnik`, `merriam-webster` or `wiktionary`); `BASE_PATH` when the site is served from a subdirectory, such as `/my-site` for `username.github.io/my-site`; `SITE_TZ` when the site's day is not `America/New_York`; anything else in `.env.example` that should differ from its default. Leave `SOURCE_DIR` unset: Deploy and Add Word stop when a site sets it.
   - **Secrets and variables > Actions > Secrets**: the API key of each dictionary the site uses (`WORDNIK_API_KEY`, `MERRIAM_WEBSTER_API_KEY`), and any `GA_*` or `SENTRY_*` setting. API keys, `GA_*` and `SENTRY_*` are secrets; everything else is a variable.
   - **Pages > Build and deployment > Source**: GitHub Actions.
   - **Environments > github-pages**: deployment branches allow `main`.
   - **Rules** or branch protection on `main`, if any: let a push from the workflow's `GITHUB_TOKEN` through, since Add Word commits straight to `main`.
4. Add the first word on your machine. A new copy has no `data/words/`, and Deploy and Add Word both stop without it, so the first word cannot come from the Actions tab:

   ```bash
   cp .env.example .env    # the settings from step 3 and your dictionary's API key (Wiktionary needs none); SOURCE_DIR stays empty
   npm run tool:local tools/add-word.ts serendipity
   npm run tool:local tools/generate-images.ts
   git add data/words public/images
   git commit -m "Add word: serendipity"
   git push -u origin main
   ```

   `SITE_TITLE` is drawn on every card, so give `.env` the title the repository variable has. The push starts Deploy, which publishes the site; if it ran before a setting was in place, run **Deploy to GitHub Pages** again from the Actions tab.
5. Run **Add Word** from the Actions tab with a word and a date other than today's: step 4 gave today its word, and Add Word refuses a date that already has one. It commits `Add word: <word>` to `main` with the word's file and its cards, and the Deploy it starts publishes the word. That run is the check that the whole setup works.

From then on the site's own files are the ones under `data/words/` and `public/images/`, plus `public/favicon.svg` and `public/favicon.ico` if it replaces them. Everything else, `data/demo/` and `public/demo/` included, stays as the engine has it and is changed only upstream, which is what keeps `npm run tool:sync` merging cleanly.

## Data Structure

Words are stored as JSON files organized by year (the `{SOURCE_DIR}` level exists only when `SOURCE_DIR` is set):

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
npm test              # Run all tests with coverage
npm run test:watch    # Watch mode for development
npm run lint          # Code style checking
npm run typecheck     # Type checking (uses Astro check)
npm run build         # Verify build succeeds
npm run test:e2e      # Playwright against the built site (run the build first)
```

**Pre-commit hooks automatically run:**
- Linting (with auto-fix)
- Tests for changed files only

See [Technical Guide - Testing](technical.md#testing) for details.

## Technology

- **[Astro](https://astro.build/)** - Static site generator
- **Dictionary APIs** - Merriam-Webster, Wordnik, Wiktionary (with fallback chain)
- **[Sharp](https://sharp.pixelplumbing.com/)** - Image generation
- **[Vitest](https://vitest.dev/)** - Testing framework
- **[GitHub Pages](https://pages.github.com/)** - Hosting platform
- **[Sentry](https://sentry.io/)** - Error monitoring

## Documentation

- **[AGENTS.md](../AGENTS.md)** - Philosophy, principles, and working guidance
- **[Technical Guide](technical.md)** - Architecture, tools, and implementation details
- **[Improvements Backlog](agents/backlog.md)** - Technical gaps and debt
- **[Potential Features](agents/features.md)** - Feature ideas, prioritized

## License

MIT License - see [LICENSE.md](../LICENSE.md) for details.