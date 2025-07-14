import fs from 'fs';

import { getAdapter } from '~adapters/factory';
import { paths } from '~config/paths';
import { getAllWordFiles, getAllWords } from '~tools/utils';
import type { WordData } from '~types/word';
import { logger } from '~utils/logger';
import { generateWordDataHash, isValidDictionaryData } from '~utils/word-data-utils';

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
 * Extracts a value from a nested object using dot notation
 * @param obj - Object to extract value from
 * @param path - Dot-separated path (e.g., "metadata.term" or "word")
 * @returns Extracted value or undefined
 */
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current, key) => (current as Record<string, unknown>)?.[key], obj);
}

/**
 * Reads and parses a word file, extracting word and date using specified field paths
 * @param filePath - Path to the word file
 * @param wordField - Dot-separated path to word field
 * @param dateField - Dot-separated path to date field
 * @returns Object with word, date, and file path, or null if extraction fails
 */
function extractWordInfo(filePath: string, wordField: string, dateField: string): { word: string; date: string; path: string } | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    const word = getNestedValue(data, wordField);
    const date = getNestedValue(data, dateField);

    if (!word || !date) {
      logger.warn('Failed to extract word or date from file', {
        filePath,
        wordField,
        dateField,
        extractedWord: word,
        extractedDate: date,
      });
      return null;
    }

    // Normalize date to YYYYMMDD format (remove dashes if present)
    const normalizedDate = String(date).replace(/-/g, '');

    return {
      word: String(word).toLowerCase(),
      date: normalizedDate,
      path: filePath,
    };
  } catch (error) {
    logger.error('Error reading word file', { filePath, error: (error as Error).message });
    return null;
  }
}

/**
 * Creates a new word file with fresh data from the dictionary adapter
 * @param word - Word to fetch data for
 * @param date - Date in YYYYMMDD format
 * @param originalPath - Original file path
 * @returns True if successful, false otherwise
 */
async function regenerateWordFile(word: string, date: string, originalPath: string): Promise<boolean> {
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
    logger.error('Failed to regenerate word file', { word, date, originalPath, error: (error as Error).message });
    return false;
  }
}

/**
 * Regenerates all word files using fresh dictionary data
 * @param options - Configuration options
 */
async function regenerateAllWords(options: RegenerateOptions): Promise<void> {
  try {
    const wordFiles = getAllWordFiles();
    console.log(`Found ${wordFiles.length} word files to process`);

    // Extract word info from all files
    const wordsToRegenerate: Array<{ word: string; date: string; path: string }> = [];

    for (const file of wordFiles) {
      const wordInfo = extractWordInfo(file.path, options.wordField, options.dateField);
      if (wordInfo) {
        wordsToRegenerate.push(wordInfo);
      }
    }

    console.log(`Successfully extracted ${wordsToRegenerate.length} words to regenerate`);

    if (options.dryRun) {
      console.log('\n--- DRY RUN MODE ---');
      console.log('Words that would be regenerated:');
      wordsToRegenerate.forEach((item, index) => {
        console.log(`${index + 1}. ${item.word} (${item.date}) - ${item.path}`);
      });
      console.log('\nUse --force to actually regenerate these words');
      return;
    }

    if (!options.force) {
      console.log('\n--- CONFIRMATION REQUIRED ---');
      console.log(`About to regenerate ${wordsToRegenerate.length} words with fresh dictionary data.`);
      console.log('This will overwrite existing word files.');
      console.log('Add --force flag to proceed without confirmation, or --dry-run to preview.');
      process.exit(0);
    }

    console.log('\nConfiguration:');
    console.log(`- Word field: ${options.wordField}`);
    console.log(`- Date field: ${options.dateField}`);
    console.log(`- Standard timeout: ${options.timeout}ms between API calls`);
    console.log(`- Rate limit timeout: ${options.rateLimitTimeout}ms when rate limit is hit`);
    console.log(`- Batch size: ${options.batchSize} words`);
    console.log(`- Batch timeout: ${options.batchTimeout}ms between batches`);

    // Process words in batches to avoid rate limits
    let currentBatch = 0;
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < wordsToRegenerate.length; i++) {
      const item = wordsToRegenerate[i];

      try {
        // Check if we need to take a longer break between batches
        if (i > 0 && i % options.batchSize === 0) {
          currentBatch++;
          console.log(`\nCompleted batch ${currentBatch}. Waiting ${options.batchTimeout/1000} seconds before next batch...\n`);
          await new Promise(resolve => setTimeout(resolve, options.batchTimeout));
        }

        console.log(`Regenerating (${i + 1}/${wordsToRegenerate.length}): ${item.word}`);

        const success = await regenerateWordFile(item.word, item.date, item.path);
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }

        // Use standard delay between requests within a batch
        if (i < wordsToRegenerate.length - 1 && (i + 1) % options.batchSize !== 0) {
          await new Promise(resolve => setTimeout(resolve, options.timeout));
        }
      } catch (error) {
        console.error(`Error processing ${item.word}:`, (error as Error).message);
        failureCount++;

        // If it's a rate limit error (HTTP 429), wait for the specified timeout
        if ('status' in error && error.status === 429) {
          console.log(`Rate limit hit, waiting for ${options.rateLimitTimeout/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, options.rateLimitTimeout));
        }
      }
    }

    console.log('\n--- REGENERATION COMPLETE ---');
    console.log(`Successfully regenerated: ${successCount} words`);
    console.log(`Failed to regenerate: ${failureCount} words`);
    console.log(`Total processed: ${successCount + failureCount} words`);

  } catch (error) {
    console.error('Error regenerating words:', (error as Error).message);
    process.exit(1);
  }
}

/**
 * Generates and writes build metadata to file including word count and hash
 */
async function writeBuildData(): Promise<void> {
  const words = getAllWords();
  const wordsCount = words.length;
  const wordsHash = generateWordDataHash(words.map(w => w.word));
  const generatedAt = new Date().toISOString();
  const buildData = {
    words_count: wordsCount,
    words_hash: wordsHash,
    generated_at: generatedAt,
  };
  const outPath = paths.buildData;
  fs.writeFileSync(outPath, JSON.stringify(buildData, null, 2));
  console.log(`Wrote build data to ${outPath}`);
}

function showHelp(): void {
  console.log(`
Regenerate All Words Tool

Regenerates all word files with fresh dictionary data, supporting flexible JSON field extraction.

Usage:
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

Note:
  All dates are normalized to YYYYMMDD format (no dashes).
  This tool will overwrite existing word files with fresh dictionary data.
  Use --dry-run first to preview changes.
`);
}

// Parse command line arguments
const args = process.argv.slice(2);

// Check for help flag
if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  showHelp();
  process.exit(0);
}

// Default options
const options: RegenerateOptions = {
  wordField: 'word',
  dateField: 'date',
  dryRun: false,
  force: false,
  timeout: 1000,
  rateLimitTimeout: 65000,
  batchSize: 4,
  batchTimeout: 10000,
};

// Parse flags
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const nextArg = args[i + 1];

  switch (arg) {
    case '--word-field':
      if (nextArg) {
        options.wordField = nextArg;
        i++; // Skip next argument since it's the value
      }
      break;
    case '--date-field':
      if (nextArg) {
        options.dateField = nextArg;
        i++; // Skip next argument since it's the value
      }
      break;
    case '--dry-run':
      options.dryRun = true;
      break;
    case '--force':
      options.force = true;
      break;
    case '--timeout':
      if (nextArg) {
        const value = parseInt(nextArg, 10);
        if (!isNaN(value) && value > 0) {
          options.timeout = value;
        }
        i++;
      }
      break;
    case '--rate-limit-timeout':
      if (nextArg) {
        const value = parseInt(nextArg, 10);
        if (!isNaN(value) && value > 0) {
          options.rateLimitTimeout = value;
        }
        i++;
      }
      break;
    case '--batch-size':
      if (nextArg) {
        const value = parseInt(nextArg, 10);
        if (!isNaN(value) && value > 0) {
          options.batchSize = value;
        }
        i++;
      }
      break;
    case '--batch-timeout':
      if (nextArg) {
        const value = parseInt(nextArg, 10);
        if (!isNaN(value) && value > 0) {
          options.batchTimeout = value;
        }
        i++;
      }
      break;
  }
}

// Run the regeneration and write build data
regenerateAllWords(options).then(writeBuildData);