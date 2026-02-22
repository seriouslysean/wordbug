import { parseArgs } from 'node:util';

import { showHelp } from '#tools/help-utils';
import { findExistingWord, generateGenericShareImage, generateShareImage, getAllWords } from '#tools/utils';
import { getAllPageMetadata } from '#utils/page-metadata-utils';
import { exit, logger } from '#utils/logger';

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
  generate: (item: T) => Promise<boolean>,
  category: string,
): Promise<void> {
  logger.info(`Starting ${category} generation`, { count: items.length });

  const results = await Promise.allSettled(
    items.map(async (item) => {
      const generated = await generate(item);
      if (generated) {
        logger.info(`Generated ${category} image`, { label: item.label });
      } else {
        logger.info(`Skipped ${category} image (unchanged)`, { label: item.label });
      }
      return generated;
    }),
  );

  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  failures.forEach(r => {
    logger.error(`Failed to generate ${category} image`, { error: r.reason?.message });
  });

  const fulfilled = results.filter((r): r is PromiseFulfilledResult<boolean> => r.status === 'fulfilled');
  const generatedCount = fulfilled.filter(r => r.value).length;
  const skippedCount = fulfilled.filter(r => !r.value).length;

  logger.info(`${category} generation complete`, {
    total: items.length,
    generated: generatedCount,
    skipped: skippedCount,
    errors: failures.length,
  });
}

/**
 * Generates image for a specific word
 */
async function generateSingleImage(word: string, force: boolean): Promise<boolean> {
  const wordData = findExistingWord(word);
  if (!wordData) {
    logger.error('Word not found in data files', { word });
    return false;
  }

  try {
    const generated = await generateShareImage(wordData.word, wordData.date, { force });
    if (generated) {
      logger.info('Generated image for word', { word: wordData.word, date: wordData.date });
    } else {
      logger.info('Skipped image for word (unchanged)', { word: wordData.word, date: wordData.date });
    }
    return true;
  } catch (error) {
    logger.error('Failed to generate image for word', { word, error: (error as Error).message });
    return false;
  }
}

/**
 * Generates image for a specific page path
 */
async function generatePageImage(pagePath: string, force: boolean): Promise<boolean> {
  const allPages = getAllPageMetadata(getAllWords());
  const page = allPages.find(p => p.path === pagePath);

  if (!page) {
    logger.error('Page not found in available pages', { pagePath });
    return false;
  }

  try {
    const generated = await generateGenericShareImage(page.title, page.path, { force });
    if (generated) {
      logger.info('Generated page image', { title: page.title, path: page.path });
    } else {
      logger.info('Skipped page image (unchanged)', { title: page.title, path: page.path });
    }
    return true;
  } catch (error) {
    logger.error('Failed to generate page image', { pagePath, error: (error as Error).message });
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

const isForce = !!cliValues.force;

// Main execution
async function main(): Promise<void> {
  logger.info('Generate images tool starting...');

  if (cliValues.page) {
    const success = await generatePageImage(cliValues.page, isForce);
    await exit(success ? 0 : 1);
  }

  if (cliValues.word) {
    const success = await generateSingleImage(cliValues.word, isForce);
    await exit(success ? 0 : 1);
  }

  const runBoth = !cliValues.words && !cliValues.generic;

  if (cliValues.words || runBoth) {
    const allWords = getAllWords();
    await bulkGenerate(
      allWords.map(w => ({ label: `${w.word} (${w.date})`, word: w.word, date: w.date })),
      (item) => generateShareImage(item.word, item.date, { force: isForce }),
      'word',
    );
  }

  if (cliValues.generic || runBoth) {
    const pages = getAllPageMetadata(getAllWords());
    await bulkGenerate(
      pages.map(p => ({ label: `${p.title} (${p.path})`, title: p.title, path: p.path })),
      (item) => generateGenericShareImage(item.title, item.path, { force: isForce }),
      'generic',
    );
  }

  await exit(0);
}

main().catch(async (error) => {
  logger.error('Tool execution failed', { error: (error as Error).message });
  await exit(1);
});
