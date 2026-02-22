import { parseArgs } from 'node:util';

import { showHelp } from '#tools/help-utils';
import { findExistingWord, generateGenericShareImage, generateShareImage, getAllWords } from '#tools/utils';
import { getAllPageMetadata } from '#utils/page-metadata-utils';

const HELP_TEXT = `
Generate Images Tool

Usage:
  npm run tool:local tools/generate-images.ts [options]
  npm run tool:generate-images [options]

Options:
  --words                   Generate images for all words only
  --generic                 Generate images for all generic pages only
  --word <word>             Generate image for specific word
  --page <path>             Generate image for specific page path
  --force                   Regenerate images even if they already exist
  -h, --help                Show this help message

Examples:
  npm run tool:generate-images                    # Generate all word and page images
  npm run tool:generate-images --words            # Generate all word images
  npm run tool:generate-images --generic          # Generate all generic page images
  npm run tool:generate-images --word serendipity # Generate image for specific word
  npm run tool:generate-images --page stats       # Generate image for stats page

Environment Variables (for GitHub workflows):
  SOURCE_DIR                 Data source directory (default: demo)
  SITE_TITLE                 Site title for images
  COLOR_PRIMARY             Primary color for gradients
  COLOR_PRIMARY_LIGHT       Light primary color
  COLOR_PRIMARY_DARK        Dark primary color

Requirements:
  - Word must exist in data files for word images
  - Required environment variables must be set
  - Output directory will be created if it doesn't exist
`;

interface BulkItem {
  label: string;
}

/**
 * Processes items in bulk with consistent logging and error tracking
 */
async function bulkGenerate<T extends BulkItem>(
  items: T[],
  generate: (item: T) => Promise<void>,
  category: string,
): Promise<void> {
  console.log(`Starting ${category} generation`, { count: items.length });

  const results = await Promise.allSettled(
    items.map(async (item) => {
      await generate(item);
      console.log(`Generated ${category} image`, { label: item.label });
    }),
  );

  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  failures.forEach(r => {
    console.error(`Failed to generate ${category} image`, { error: r.reason?.message });
  });

  console.log(`${category} generation complete`, {
    total: items.length,
    success: items.length - failures.length,
    errors: failures.length,
  });
}

/**
 * Generates image for a specific word
 */
async function generateSingleImage(word: string): Promise<boolean> {
  const wordData = findExistingWord(word);
  if (!wordData) {
    console.error('Word not found in data files', { word });
    return false;
  }

  try {
    await generateShareImage(wordData.word, wordData.date);
    console.log('Generated image for word', { word: wordData.word, date: wordData.date });
    return true;
  } catch (error) {
    console.error('Failed to generate image for word', { word, error: (error as Error).message });
    return false;
  }
}

/**
 * Generates image for a specific page path
 */
async function generatePageImage(pagePath: string): Promise<boolean> {
  const allPages = getAllPageMetadata(getAllWords());
  const page = allPages.find(p => p.path === pagePath);

  if (!page) {
    console.error('Page not found in available pages', { pagePath });
    return false;
  }

  try {
    await generateGenericShareImage(page.title, page.path);
    console.log('Generated page image', { title: page.title, path: page.path });
    return true;
  } catch (error) {
    console.error('Failed to generate page image', { pagePath, error: (error as Error).message });
    return false;
  }
}

// Parse command line arguments
const { values: cliValues } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: 'boolean', short: 'h', default: false },
    force: { type: 'boolean', default: false },
    words: { type: 'boolean', default: false },
    generic: { type: 'boolean', default: false },
    page: { type: 'string' },
    word: { type: 'string' },
  },
  strict: true,
});

if (cliValues.help) {
  showHelp(HELP_TEXT);
  process.exit(0);
}

// Main execution
(async () => {
  try {
    console.log('Generate images tool starting...');

    if (cliValues.page) {
      process.exit(await generatePageImage(cliValues.page) ? 0 : 1);
    }

    if (cliValues.word) {
      process.exit(await generateSingleImage(cliValues.word) ? 0 : 1);
    }

    const runBoth = !cliValues.words && !cliValues.generic;

    if (cliValues.words || runBoth) {
      const allWords = getAllWords();
      await bulkGenerate(
        allWords.map(w => ({ label: `${w.word} (${w.date})`, word: w.word, date: w.date })),
        (item) => generateShareImage(item.word, item.date),
        'word',
      );
    }

    if (cliValues.generic || runBoth) {
      const pages = getAllPageMetadata(getAllWords());
      await bulkGenerate(
        pages.map(p => ({ label: `${p.title} (${p.path})`, title: p.title, path: p.path })),
        (item) => generateGenericShareImage(item.title, item.path),
        'generic',
      );
    }

    process.exit(0);
  } catch (error) {
    console.error('Tool execution failed', { error: (error as Error).message });
    process.exit(1);
  }
})();
