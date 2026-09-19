import fs from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

import { fetchWithFallback } from '#adapters';
import { isEntryPoint } from '#tools/entry';
import { COMMON_ENV_DOCS, parseToolArgs, showHelp } from '#tools/help-utils';
import { buildWordData, getWordFiles, primaryPartOfSpeech, tryFetchRelations } from '#tools/utils';
import type { WordEnrichment } from '#types';
import { isRateLimited } from '#utils/adapter-utils';
import { exit, getErrorMessage, logger } from '#utils/logger';
import { isRecord } from '#utils/type-guards';
import { isWordEnrichment } from '#utils/stored-word-validation';

interface StoredEntry {
  preserveCase: boolean;
  enrichment?: WordEnrichment;
}

/**
 * Reads, once, what a backfill must carry over from the file it replaces: the
 * preserveCase flag and any enrichment. An unreadable file carries nothing.
 */
function readStoredEntry(filePath: string): StoredEntry {
  try {
    const data: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!isRecord(data)) {
      return { preserveCase: false };
    }
    return {
      preserveCase: data.preserveCase === true,
      enrichment: isWordEnrichment(data.enrichment) ? data.enrichment : undefined,
    };
  } catch {
    return { preserveCase: false };
  }
}

interface RegenerateOptions {
  dryRun: boolean;
  force: boolean;
  timeout: number;
  batchSize: number;
  batchTimeout: number;
}

// Single source for option defaults: parseArgs and the help text both read it.
export const DEFAULTS = {
  timeout: 4000,
  batchSize: 10,
  batchTimeout: 60000,
} as const;

// First rate-limit retry waits this long; each further retry doubles it.
const RATE_LIMIT_BACKOFF_MS = 30000;

/**
 * Parses a whole-number CLI option. Anything else (NaN, fractions, trailing
 * junk, values below `min`) exits 1, so a typo cannot become a zero-size batch
 * or a NaN delay. The refusal logs at warn, as add-word refuses its input: a
 * typo is not a fault, and the CLI logger forwards only errors to Sentry.
 */
async function parseCount(option: string, raw: string, min: number): Promise<number> {
  const value = Number(raw);
  if (!/^\d+$/.test(raw) || value < min) {
    logger.warn('Invalid numeric option', { option: `--${option}`, expected: `a whole number of at least ${min}`, got: raw });
    return exit(1);
  }
  return value;
}

/**
 * Creates a new word file with fresh data from the dictionary adapter
 * @param word - Word to fetch data for
 * @param date - Date in YYYYMMDD format
 * @param originalPath - Original file path
 * @param retryCount - Current retry attempt (for exponential backoff)
 * @returns True if successful, false otherwise
 */
export async function regenerateWordFile(word: string, date: string, originalPath: string, retryCount: number = 0): Promise<boolean> {
  const maxRetries = 3;

  try {
    if (!process.env.DICTIONARY_ADAPTER) {
      throw new Error('DICTIONARY_ADAPTER environment variable is required');
    }

    const { response, adapterName } = await fetchWithFallback(word);
    const relations = await tryFetchRelations(word, primaryPartOfSpeech(response.definitions));
    const { preserveCase, enrichment: storedEnrichment } = readStoredEntry(originalPath);
    const wordData = buildWordData({
      // Keep original casing for preserveCase words; backfill must not lowercase them.
      word: preserveCase ? word : word.toLowerCase(),
      date,
      adapterName,
      response,
      relations,
      preserveCase,
      storedEnrichment,
    });

    fs.writeFileSync(originalPath, JSON.stringify(wordData, null, 4));
    return true;
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    // A rate limit from any adapter in the chain is worth backing off for
    if (isRateLimited(error) && retryCount < maxRetries) {
      // Exponential backoff: 2^retryCount * 30 seconds
      const backoffDelay = Math.pow(2, retryCount) * RATE_LIMIT_BACKOFF_MS;
      logger.info('Rate limited, retrying with backoff', {
        word,
        delaySec: backoffDelay / 1000,
        attempt: retryCount + 1,
        maxRetries,
      });
      await delay(backoffDelay);
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
 * Regenerates all word files using fresh dictionary data. Every word is
 * attempted; the returned failure count decides the exit code.
 * @param options - Configuration options
 * @returns Number of words that could not be regenerated
 */
async function regenerateAllWords(options: RegenerateOptions): Promise<number> {
  try {
    // Unreadable files are already logged; each counts as a failure, so a
    // run that could not see every word never reports success.
    const { files: wordsToRegenerate, failures: unreadable } = getWordFiles();
    logger.info('Found word files to process', { count: wordsToRegenerate.length, unreadable: unreadable.length });

    if (options.dryRun) {
      logger.info('DRY RUN MODE - Words that would be regenerated:');
      wordsToRegenerate.forEach((item, index) => {
        logger.info('Word entry', { index: index + 1, word: item.word, date: item.date, path: item.path });
      });
      logger.info('Use --force to actually regenerate these words');
      return unreadable.length;
    }

    if (!options.force) {
      logger.info('CONFIRMATION REQUIRED', { wordCount: wordsToRegenerate.length });
      logger.info('This will overwrite existing word files.');
      logger.info('Add --force flag to proceed without confirmation, or --dry-run to preview.');
      await exit(0);
    }

    logger.info('Configuration', {
      timeoutMs: options.timeout,
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
          await delay(options.batchTimeout);
        }

        logger.info('Regenerating word', { index: i + 1, total: wordsToRegenerate.length, word: item.word });

        const success = await regenerateWordFile(item.word, item.date, item.path);
        outcomes.push(success);

        // Use standard delay between requests within a batch
        if (i < wordsToRegenerate.length - 1 && (i + 1) % options.batchSize !== 0) {
          await delay(options.timeout);
        }
      } catch (error) {
        logger.error('Failed to process word', { word: item.word, error: getErrorMessage(error) });
        outcomes.push(false);
      }
    }

    const successCount = outcomes.filter(Boolean).length;
    const failureCount = outcomes.length - successCount + unreadable.length;

    logger.info('Regeneration complete', {
      success: successCount,
      failed: failureCount,
      total: outcomes.length + unreadable.length,
    });

    return failureCount;
  } catch (error) {
    logger.error('Failed to regenerate words', { error: getErrorMessage(error) });
    return await exit(1);
  }
}


const HELP_TEXT = `
Regenerate All Words Tool

Regenerates all word files with fresh dictionary data.

Usage:
  npm run tool:local tools/regenerate-all-words.ts -- [options]
  npm run tool:regenerate-all-words -- [options]

Options:
  --dry-run                  Preview what would be regenerated without doing it
  --force                    Skip confirmation prompts
  --timeout <ms>             Delay between API calls (default: ${DEFAULTS.timeout})
  --batch-size <num>         Words per batch (default: ${DEFAULTS.batchSize})
  --batch-timeout <ms>       Pause between batches (default: ${DEFAULTS.batchTimeout})
  -h, --help                 Show this help message

Examples:
  npm run tool:regenerate-all-words -- --dry-run
  npm run tool:regenerate-all-words -- --timeout 2000 --batch-size 3 --force

Environment Variables (for GitHub workflows):
  DICTIONARY_ADAPTER         Dictionary API to use (required)
  WORDNIK_API_KEY           API key for dictionary access (required)
  SOURCE_DIR                Data source subdirectory (unset = root paths)

Note:
  Rate-limited lookups retry up to 3 times, waiting ${RATE_LIMIT_BACKOFF_MS / 1000}s and doubling each time.
  This tool will overwrite existing word files with fresh dictionary data.
  Use --dry-run first to preview changes.
${COMMON_ENV_DOCS}
`;

if (isEntryPoint(import.meta.url)) {
  const { values } = await parseToolArgs({
    args: process.argv.slice(2),
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      'dry-run': { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
      timeout: { type: 'string', default: String(DEFAULTS.timeout) },
      'batch-size': { type: 'string', default: String(DEFAULTS.batchSize) },
      'batch-timeout': { type: 'string', default: String(DEFAULTS.batchTimeout) },
    },
    strict: true,
  });

  if (values.help || process.argv.length <= 2) {
    showHelp(HELP_TEXT);
    process.exit(0);
  }

  const run = async (): Promise<void> => {
    // The options are validated before any word is touched.
    const failed = await regenerateAllWords({
      dryRun: !!values['dry-run'],
      force: !!values.force,
      timeout: await parseCount('timeout', values.timeout, 0),
      batchSize: await parseCount('batch-size', values['batch-size'], 1),
      batchTimeout: await parseCount('batch-timeout', values['batch-timeout'], 0),
    });

    if (failed > 0) {
      logger.error('Regeneration finished with failures', { failed });
      await exit(1);
    }
  };

  run().catch(async (error: unknown) => {
    logger.error('Regeneration tool failed', { error: getErrorMessage(error) });
    await exit(1);
  });
}
