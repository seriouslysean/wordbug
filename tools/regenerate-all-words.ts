import fs from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

import { fetchWithFallback } from '#adapters';
import { isEntryPoint } from '#tools/entry';
import { COMMON_ENV_DOCS, parseToolArgs, showHelp } from '#tools/help-utils';
import { buildWordData, getWordFiles, primaryPartOfSpeech, tryFetchRelations } from '#tools/utils';
import type { WordEnrichment } from '#types';
import { isRateLimited } from '#utils/adapter-utils';
import { exit, getErrorMessage, logger } from '#utils/logger';
import { isRecord, isString } from '#utils/type-guards';
import { isWordEnrichment, parseWordData } from '#utils/stored-word-validation';

interface StoredEntry {
  preserveCase: boolean;
  adapter?: string;
  enrichment?: WordEnrichment;
}

/**
 * Reads, once, what a backfill must carry over from the file it replaces: the
 * preserveCase flag and any enrichment, with the adapter that supplied it. An
 * unreadable file carries nothing.
 */
function readStoredEntry(filePath: string): StoredEntry {
  try {
    const data: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!isRecord(data)) {
      return { preserveCase: false };
    }
    return {
      preserveCase: data.preserveCase === true,
      adapter: isString(data.adapter) ? data.adapter : undefined,
      enrichment: isWordEnrichment(data.enrichment) ? data.enrichment : undefined,
    };
  } catch {
    return { preserveCase: false };
  }
}

interface RegenerateOptions {
  /** Only the records whose stored `adapter` is this, when given */
  adapter?: string;
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

// The stored `adapter` of a word written by hand: no dictionary supplied it
const MANUAL_ADAPTER = 'manual';

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

interface RegenerateWordOptions {
  /**
   * True when the run was asked to move records to another dictionary
   * (--adapter). Otherwise a record is only ever refreshed from the
   * dictionary that wrote it.
   */
  resource?: boolean;
}

/**
 * Creates a new word file with fresh data from the dictionary adapter
 * @param word - Word to fetch data for
 * @param date - Date in YYYYMMDD format
 * @param originalPath - Original file path
 * @param options - Whether the record may change dictionary
 * @param retryCount - Current retry attempt (for exponential backoff)
 * @returns True if a valid record was written, false otherwise
 */
export async function regenerateWordFile(
  word: string,
  date: string,
  originalPath: string,
  options: RegenerateWordOptions = {},
  retryCount: number = 0,
): Promise<boolean> {
  const maxRetries = 3;

  try {
    if (!process.env.DICTIONARY_ADAPTER) {
      throw new Error('DICTIONARY_ADAPTER environment variable is required');
    }

    const { response, adapterName } = await fetchWithFallback(word);
    const stored = readStoredEntry(originalPath);
    // A refresh must not change where a word comes from behind the owner's
    // back. The fallback answers whenever the primary fails for any reason (a
    // rate limit, an outage, a timeout), and written, its answer would turn a
    // Merriam-Webster record into a Wiktionary one and lose the pronunciation,
    // audio and etymology with it. So the stored record stays and the word
    // counts as failed, unless changing dictionary is what the run is for.
    if (!options.resource && stored.adapter !== undefined && stored.adapter !== adapterName) {
      throw new Error(
        `"${word}" is stored from ${stored.adapter} and was answered by ${adapterName}; the stored record is kept. `
        + `To replace it from another dictionary, run with --adapter ${stored.adapter}`,
      );
    }
    const relations = await tryFetchRelations(word, primaryPartOfSpeech(response));
    const { preserveCase } = stored;
    // Enrichment is carried over only from the dictionary that answers now: a
    // pronunciation another dictionary supplied would otherwise be kept under
    // this one's name, and outlive every other trace of where it came from
    const storedEnrichment = stored.adapter === adapterName ? stored.enrichment : undefined;
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

    // Held to the guard every reader applies, so a record the site could not
    // build is refused here and the file it would replace is left as it was
    const contents = JSON.stringify(wordData, null, 4);
    parseWordData(contents, originalPath);
    fs.writeFileSync(originalPath, contents);
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
      return regenerateWordFile(word, date, originalPath, options, retryCount + 1);
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
 * Regenerates all word files using fresh dictionary data. Every word a
 * dictionary supplied is attempted; a word written by hand is skipped
 * without a lookup, since no dictionary's answer should replace it. The
 * returned failure count decides the exit code, and a skip is not a failure.
 * @param options - Configuration options
 * @returns Number of words that could not be regenerated
 */
async function regenerateAllWords(options: RegenerateOptions): Promise<number> {
  try {
    // Hand-written words have no dictionary to be re-sourced from, and are
    // not to be replaced by one. Refused at warn, as other input is.
    if (options.adapter === MANUAL_ADAPTER) {
      logger.warn('Words written by hand cannot be re-sourced', {
        adapter: options.adapter,
        reason: 'A record whose adapter is "manual" came from no dictionary, and no lookup replaces it',
      });
      return await exit(1);
    }

    // Unreadable files are already logged; each counts as a failure, so a
    // run that could not see every word never reports success.
    const { files, failures: unreadable } = getWordFiles();
    // The stored value is compared as written: it may name a dictionary this
    // version no longer has an adapter for, which is when a site re-sources
    const selected = options.adapter === undefined
      ? files
      : files.filter(file => file.adapter === options.adapter);
    const wordsToRegenerate = selected.filter(file => file.adapter !== MANUAL_ADAPTER);
    const skipped = selected.length - wordsToRegenerate.length;
    logger.info('Found word files to process', {
      count: wordsToRegenerate.length,
      skipped,
      unreadable: unreadable.length,
      ...(options.adapter === undefined ? {} : { adapter: options.adapter, of: files.length }),
    });
    if (skipped > 0) {
      logger.info('Skipping words written by hand', { skipped, adapter: MANUAL_ADAPTER });
    }

    // A filter that matches nothing is a mistyped name ("Merriam-Webster"), or
    // a job already done: either way no word was regenerated, and exit 0 would
    // say they all were. Refused at warn, as the tool refuses its other input.
    if (options.adapter !== undefined && selected.length === 0) {
      const stored = Object.entries(Object.groupBy(files, file => file.adapter ?? '(none)'))
        .map(([adapter, records]) => `${adapter} (${records?.length ?? 0})`)
        .toSorted();
      logger.warn('No stored word has that adapter', { adapter: options.adapter, stored: stored.join(', ') });
      return await exit(1);
    }

    if (options.dryRun) {
      logger.info('DRY RUN MODE - Words that would be regenerated:');
      wordsToRegenerate.forEach((item, index) => {
        logger.info('Word entry', { index: index + 1, word: item.word, date: item.date, path: item.path });
      });
      logger.info('Use --force to actually regenerate these words');
      return unreadable.length;
    }

    // Nothing to confirm when the corpus could not be read: asking to
    // confirm zero words, exit 0, would pass a missing words directory off as
    // a run that only needs --force. Each unreadable path is already logged.
    if (!options.force && unreadable.length > 0) {
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

        const success = await regenerateWordFile(item.word, item.date, item.path, { resource: options.adapter !== undefined });
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
      skipped,
      total: outcomes.length + unreadable.length + skipped,
    });

    return failureCount;
  } catch (error) {
    logger.error('Failed to regenerate words', { error: getErrorMessage(error) });
    return await exit(1);
  }
}


const HELP_TEXT = `
Regenerate All Words Tool

Regenerates all word files with fresh dictionary data, or with --adapter only
those a given dictionary supplied. A word that cannot be looked up keeps its
file as it was, and the tool exits 1.

Usage:
  npm run tool:local tools/regenerate-all-words.ts -- [options]
  npm run tool:regenerate-all-words -- [options]

Options:
  --adapter <name>           Only words whose stored "adapter" is <name>, exactly as
                             stored; each may then come from another dictionary
  --dry-run                  Preview what would be regenerated without doing it
  --force                    Skip confirmation prompts
  --timeout <ms>             Delay between API calls (default: ${DEFAULTS.timeout})
  --batch-size <num>         Words per batch (default: ${DEFAULTS.batchSize})
  --batch-timeout <ms>       Pause between batches (default: ${DEFAULTS.batchTimeout})
  -h, --help                 Show this help message

Examples:
  npm run tool:regenerate-all-words -- --dry-run
  npm run tool:regenerate-all-words -- --timeout 2000 --batch-size 3 --force
  npm run tool:regenerate-all-words -- --adapter wordnik --dry-run

Note:
  Rate-limited lookups retry up to 3 times, waiting ${RATE_LIMIT_BACKOFF_MS / 1000}s and doubling each time.
  This tool will overwrite existing word files with fresh dictionary data.
  A word written by hand (stored adapter "manual") is skipped without a
  lookup and counted as skipped, which is not a failure.
  A word keeps its date, its case and whether that case is preserved. Without
  --adapter a word is refreshed only from the dictionary that wrote it: when
  another one answers (the fallback, after the primary failed), the stored
  record is kept and the word counts as failed. Stored enrichment is kept
  only when the same dictionary answers again.
  Use --dry-run first to preview changes.
${COMMON_ENV_DOCS}
`;

if (isEntryPoint(import.meta.url)) {
  const { values } = await parseToolArgs({
    args: process.argv.slice(2),
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      'dry-run': { type: 'boolean', default: false },
      adapter: { type: 'string' },
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
      adapter: values.adapter,
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
