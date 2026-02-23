import fs from 'fs';

import { getAdapter } from '#adapters';
import { COMMON_ENV_DOCS,showHelp } from '#tools/help-utils';
import { getAllWords } from '#tools/utils';
import type { WordData } from '#types';
import { exit, logger } from '#utils/logger';
import { isValidDictionaryData } from '#utils/word-validation';

interface RegenerateOptions {
  wordField: string;
  dateField: string;
  dryRun: boolean;
  force: boolean;
  timeout: number;
  rateLimitTimeout: number;
  batchSize: number;
  batchTimeout: number;
}


/**
 * Creates a new word file with fresh data from the dictionary adapter
 * @param word - Word to fetch data for
 * @param date - Date in YYYYMMDD format
 * @param originalPath - Original file path
 * @param retryCount - Current retry attempt (for exponential backoff)
 * @returns True if successful, false otherwise
 */
async function regenerateWordFile(word: string, date: string, originalPath: string, retryCount: number = 0): Promise<boolean> {
  const maxRetries = 3;

  try {
    if (!process.env.DICTIONARY_ADAPTER) {
      throw new Error('DICTIONARY_ADAPTER environment variable is required');
    }

    const adapter = getAdapter();
    const response = await adapter.fetchWordData(word);
    const data = response.definitions;

    if (!isValidDictionaryData(data)) {
      logger.error('Invalid word data received from adapter', { word, adapter: adapter.name });
      return false;
    }

    const wordData: WordData = {
      word: word.toLowerCase(),
      date,
      adapter: process.env.DICTIONARY_ADAPTER,
      data,
    };

    fs.writeFileSync(originalPath, JSON.stringify(wordData, null, 4));
    return true;
  } catch (error) {
    const errorMessage = (error as Error).message;

    // Check if this is a rate limit error
    const isRateLimit = errorMessage.includes('Rate limit') ||
                       errorMessage.includes('rate limit') ||
                       errorMessage.includes('429') ||
                       ('status' in error && error.status === 429);

    if (isRateLimit && retryCount < maxRetries) {
      // Exponential backoff: 2^retryCount * 30 seconds
      const backoffDelay = Math.pow(2, retryCount) * 30000;
      logger.info('Rate limited, retrying with backoff', {
        word,
        delaySec: backoffDelay / 1000,
        attempt: retryCount + 1,
        maxRetries,
      });
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return regenerateWordFile(word, date, originalPath, retryCount + 1);
    }

    logger.error('Failed to regenerate word file', {
      word,
      date,
      originalPath: originalPath,
      error: errorMessage,
    });
    return false;
  }
}

/**
 * Regenerates all word files using fresh dictionary data
 * @param options - Configuration options
 */
async function regenerateAllWords(options: RegenerateOptions): Promise<void> {
  try {
    const allWords = getAllWords();
    logger.info('Found word files to process', { count: allWords.length });

    const wordsToRegenerate = allWords.map(wordData => ({
      word: wordData.word,
      date: wordData.date,
      path: `data/words/${wordData.date.slice(0, 4)}/${wordData.date}.json`,
    }));

    logger.info('Extracted words to regenerate', { count: wordsToRegenerate.length });

    if (options.dryRun) {
      logger.info('DRY RUN MODE - Words that would be regenerated:');
      wordsToRegenerate.forEach((item, index) => {
        logger.info('Word entry', { index: index + 1, word: item.word, date: item.date, path: item.path });
      });
      logger.info('Use --force to actually regenerate these words');
      return;
    }

    if (!options.force) {
      logger.info('CONFIRMATION REQUIRED', { wordCount: wordsToRegenerate.length });
      logger.info('This will overwrite existing word files.');
      logger.info('Add --force flag to proceed without confirmation, or --dry-run to preview.');
      await exit(0);
    }

    logger.info('Configuration', {
      wordField: options.wordField,
      dateField: options.dateField,
      timeoutMs: options.timeout,
      rateLimitTimeoutMs: options.rateLimitTimeout,
      batchSize: options.batchSize,
      batchTimeoutMs: options.batchTimeout,
    });

    // Process words in batches to avoid rate limits
    const outcomes: boolean[] = [];

    for (const [i, item] of wordsToRegenerate.entries()) {
      try {
        // Check if we need to take a longer break between batches
        if (i > 0 && i % options.batchSize === 0) {
          const currentBatch = i / options.batchSize;
          logger.info('Completed batch, pausing', { batch: currentBatch, delaySec: options.batchTimeout / 1000 });
          await new Promise(resolve => setTimeout(resolve, options.batchTimeout));
        }

        logger.info('Regenerating word', { index: i + 1, total: wordsToRegenerate.length, word: item.word });

        const success = await regenerateWordFile(item.word, item.date, item.path);
        outcomes.push(success);

        // Use standard delay between requests within a batch
        if (i < wordsToRegenerate.length - 1 && (i + 1) % options.batchSize !== 0) {
          await new Promise(resolve => setTimeout(resolve, options.timeout));
        }
      } catch (error) {
        logger.error('Failed to process word', { word: item.word, error: (error as Error).message });
        outcomes.push(false);
      }
    }

    const successCount = outcomes.filter(Boolean).length;
    const failureCount = outcomes.length - successCount;

    logger.info('Regeneration complete', {
      success: successCount,
      failed: failureCount,
      total: outcomes.length,
    });

  } catch (error) {
    logger.error('Failed to regenerate words', { error: (error as Error).message });
    await exit(1);
  }
}


const HELP_TEXT = `
Regenerate All Words Tool

Regenerates all word files with fresh dictionary data, supporting flexible JSON field extraction.

Usage:
  npm run tool:local tools/regenerate-all-words.ts [options]
  npm run tool:regenerate-all-words [options]

Options:
  --word-field <path>        JSON path to word field (default: "word")
  --date-field <path>        JSON path to date field (default: "date")
  --dry-run                  Preview what would be regenerated without doing it
  --force                    Skip confirmation prompts
  --timeout <ms>             Timeout between API calls (default: 1000ms)
  --rate-limit-timeout <ms>  Timeout when rate limit hit (default: 65000ms)
  --batch-size <num>         Words per batch (default: 4)
  --batch-timeout <ms>       Timeout between batches (default: 10000ms)
  -h, --help                 Show this help message

Field Path Examples:
  "word"                     Direct field access
  "metadata.term"            Nested field access
  "data.0.word"              Array element access

Examples:
  npm run tool:regenerate-all-words --dry-run
  npm run tool:regenerate-all-words --word-field "metadata.term" --date-field "dateCode" --force
  npm run tool:regenerate-all-words --timeout 2000 --batch-size 3 --force

Environment Variables (for GitHub workflows):
  DICTIONARY_ADAPTER         Dictionary API to use (required)
  WORDNIK_API_KEY           API key for dictionary access (required)
  SOURCE_DIR                Data source directory (default: demo)

Note:
  All dates are normalized to YYYYMMDD format (no dashes).
  This tool will overwrite existing word files with fresh dictionary data.
  Use --dry-run first to preview changes.
${COMMON_ENV_DOCS}
`;

// Parse command line arguments
import { parseArgs } from 'node:util';

const DEFAULTS = {
  wordField: 'word',
  dateField: 'date',
  timeout: 4000,
  rateLimitTimeout: 3600000,
  batchSize: 10,
  batchTimeout: 60000,
} as const;

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: 'boolean', short: 'h', default: false },
    'word-field': { type: 'string', default: DEFAULTS.wordField },
    'date-field': { type: 'string', default: DEFAULTS.dateField },
    'dry-run': { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
    timeout: { type: 'string', default: String(DEFAULTS.timeout) },
    'rate-limit-timeout': { type: 'string', default: String(DEFAULTS.rateLimitTimeout) },
    'batch-size': { type: 'string', default: String(DEFAULTS.batchSize) },
    'batch-timeout': { type: 'string', default: String(DEFAULTS.batchTimeout) },
  },
  strict: true,
});

if (values.help || process.argv.length <= 2) {
  showHelp(HELP_TEXT);
  process.exit(0);
}

const options: RegenerateOptions = {
  wordField: values['word-field'] ?? DEFAULTS.wordField,
  dateField: values['date-field'] ?? DEFAULTS.dateField,
  dryRun: !!values['dry-run'],
  force: !!values.force,
  timeout: parseInt(values.timeout ?? String(DEFAULTS.timeout), 10),
  rateLimitTimeout: parseInt(values['rate-limit-timeout'] ?? String(DEFAULTS.rateLimitTimeout), 10),
  batchSize: parseInt(values['batch-size'] ?? String(DEFAULTS.batchSize), 10),
  batchTimeout: parseInt(values['batch-timeout'] ?? String(DEFAULTS.batchTimeout), 10),
};

// Run the regeneration and write build data
regenerateAllWords(options).catch(async (error) => {
  logger.error('Regeneration tool failed', { error: (error as Error).message });
  await exit(1);
});
