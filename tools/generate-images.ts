import { isEntryPoint } from '#tools/entry';
import { parseToolArgs, showHelp } from '#tools/help-utils';
import {
  findExistingWord,
  generateGenericShareImage,
  generateShareImage,
  getAllWords,
  markImageCacheCurrent,
  readImageCache,
} from '#tools/utils';
import type { CardRender, GenerateImageOptions } from '#tools/utils';
import { getAllPageMetadata } from '#utils/page-metadata-utils';
import { exit, getErrorMessage, logger } from '#utils/logger';

const HELP_TEXT = `
Generate Images Tool

Usage:
  npm run tool:local tools/generate-images.ts -- [options]
  npm run tool:generate-images -- [options]

Options:
  --words                   Generate images for all words only
  --generic                 Generate images for all generic pages only
  --word <word>             Generate image for specific word
  --page <path>             Generate image for specific page path, with its leading slash
  --force                   Regenerate images even if they already exist
  -h, --help                Show this help message

Examples:
  npm run tool:generate-images                       # Generate all word and page images
  npm run tool:generate-images -- --words            # Generate all word images
  npm run tool:generate-images -- --generic          # Generate all generic page images
  npm run tool:generate-images -- --word japan # Generate image for specific word
  npm run tool:generate-images -- --page /stats      # Generate image for stats page

Environment Variables (for GitHub workflows):
  SOURCE_DIR                 Data source subdirectory (unset = root paths)
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

interface BulkResult {
  failures: number;
  /** Every card that rendered or was already current, for the marker */
  rendered: CardRender[];
}

const CONCURRENCY_LIMIT = 10;

/**
 * Processes items in batches with consistent logging and error tracking.
 * Limits concurrency to avoid OOM/fd-exhaustion on large datasets.
 * Every item is attempted; the returned failure count decides the exit code.
 */
async function bulkGenerate<T extends BulkItem>(
  items: T[],
  generate: (item: T) => Promise<CardRender>,
  category: string,
): Promise<BulkResult> {
  logger.info(`Starting ${category} generation`, { count: items.length });

  const results: PromiseSettledResult<CardRender>[] = [];

  for (let i = 0; i < items.length; i += CONCURRENCY_LIMIT) {
    const batch = items.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.allSettled(
      batch.map(async (item) => {
        const result = await generate(item);
        if (result.generated) {
          logger.info(`Generated ${category} image`, { label: item.label });
        } else {
          logger.info(`Skipped ${category} image (unchanged)`, { label: item.label });
        }
        return result;
      }),
    );
    results.push(...batchResults);
  }

  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  failures.forEach(r => {
    logger.error(`Failed to generate ${category} image`, { error: r.reason?.message });
  });

  const rendered = results
    .filter((r): r is PromiseFulfilledResult<CardRender> => r.status === 'fulfilled')
    .map(r => r.value);
  const generatedCount = rendered.filter(r => r.generated).length;

  logger.info(`${category} generation complete`, {
    total: items.length,
    generated: generatedCount,
    skipped: rendered.length - generatedCount,
    errors: failures.length,
  });

  return { failures: failures.length, rendered };
}

/**
 * Generates image for a specific word
 */
async function generateSingleImage(word: string, options: GenerateImageOptions): Promise<boolean> {
  const { match: wordData, failures } = findExistingWord(word);
  // The word may be in data the scan could not read, each part of which is
  // already logged at error: that is the fault, not a missing word
  if (!wordData && failures.length > 0) {
    return false;
  }
  // A word that is not in the data is the operator's typo, refused at warn as
  // add-word refuses its input: the CLI logger forwards only errors to Sentry
  if (!wordData) {
    logger.warn('Word not found in data files', { word });
    return false;
  }

  try {
    const { generated } = await generateShareImage(wordData.word, wordData.date, options);
    if (generated) {
      logger.info('Generated image for word', { word: wordData.word, date: wordData.date });
    } else {
      logger.info('Skipped image for word (unchanged)', { word: wordData.word, date: wordData.date });
    }
    return true;
  } catch (error) {
    logger.error('Failed to generate image for word', { word, error: getErrorMessage(error) });
    return false;
  }
}

/**
 * Generates image for a specific page path
 */
async function generatePageImage(pagePath: string, options: GenerateImageOptions): Promise<boolean> {
  const { words, failures } = getAllWords();
  // The page list is built from the corpus, so a partial one could draw a
  // wrong card. Each unreadable directory or file is already logged at error.
  if (failures.length > 0) {
    return false;
  }

  const allPages = getAllPageMetadata(words);
  const page = allPages.find(p => p.path === pagePath);

  // An unknown page path is the operator's typo too
  if (!page) {
    logger.warn('Page not found in available pages', { pagePath });
    return false;
  }

  try {
    const { generated } = await generateGenericShareImage(page.title, page.path, options);
    if (generated) {
      logger.info('Generated page image', { title: page.title, path: page.path });
    } else {
      logger.info('Skipped page image (unchanged)', { title: page.title, path: page.path });
    }
    return true;
  } catch (error) {
    logger.error('Failed to generate page image', { pagePath, error: getErrorMessage(error) });
    return false;
  }
}

interface GenerateImagesOptions {
  force: boolean;
  words: boolean;
  generic: boolean;
  page?: string;
  word?: string;
}

// Main execution
async function main(options: GenerateImagesOptions): Promise<void> {
  logger.info('Generate images tool starting...');

  // Settled once: every image in this run is decided against the same
  // snapshot, so the first regenerated image cannot make the rest look current.
  const cache = readImageCache();
  if (cache.stale && !options.force) {
    logger.info('Image settings differ from the last complete run, regenerating existing images');
  }
  const renderOptions: GenerateImageOptions = { regenerate: options.force || cache.stale, cards: cache.cards };

  if (options.page) {
    const success = await generatePageImage(options.page, renderOptions);
    await exit(success ? 0 : 1);
  }

  if (options.word) {
    const success = await generateSingleImage(options.word, renderOptions);
    await exit(success ? 0 : 1);
  }

  // Neither flag means both; naming both means both too.
  const runBoth = !options.words && !options.generic;
  const coversWords = options.words || runBoth;
  const coversGeneric = options.generic || runBoth;
  // Read once for both categories. Unreadable files are already logged; each
  // one fails the run, since its card and the pages it feeds are missing.
  const { words, failures: unreadable } = getAllWords();
  const failed = { count: unreadable.length };
  const rendered: CardRender[] = [];

  if (coversWords) {
    const result = await bulkGenerate(
      words.map(w => ({ label: `${w.word} (${w.date})`, word: w.word, date: w.date })),
      (item) => generateShareImage(item.word, item.date, renderOptions),
      'word',
    );
    failed.count += result.failures;
    rendered.push(...result.rendered);
  }

  if (coversGeneric) {
    const pages = getAllPageMetadata(words);
    const result = await bulkGenerate(
      pages.map(p => ({ label: `${p.title} (${p.path})`, title: p.title, path: p.path })),
      (item) => generateGenericShareImage(item.title, item.path, renderOptions),
      'generic',
    );
    failed.count += result.failures;
    rendered.push(...result.rendered);
  }

  if (failed.count > 0) {
    logger.error('Image generation finished with failures', { failed: failed.count });
    await exit(1);
  }

  // Only a run that covered every word and every page certifies the corpus,
  // however that coverage was requested.
  if (coversWords && coversGeneric) {
    markImageCacheCurrent(rendered);
  }

  await exit(0);
}

// Everything that reads argv lives behind the guard, so importing this module
// runs no CLI code.
if (isEntryPoint(import.meta.url)) {
  const { values } = await parseToolArgs({
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

  if (values.help) {
    showHelp(HELP_TEXT);
    process.exit(0);
  }

  main({
    force: !!values.force,
    words: !!values.words,
    generic: !!values.generic,
    page: values.page,
    word: values.word,
  }).catch(async (error) => {
    logger.error('Tool execution failed', { error: getErrorMessage(error) });
    await exit(1);
  });
}
