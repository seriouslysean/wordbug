import fs from 'fs';
import path from 'path';

import { paths } from '#config/paths';
import { COMMON_ENV_DOCS,showHelp } from '#tools/help-utils';
import { createWordEntry, findExistingWord } from '#tools/utils';
import type { WordData } from '#types';
import { getTodayYYYYMMDD, isValidDate } from '#utils/date-utils';
import { exit, logger } from '#utils/logger';

/**
 * Checks if a file exists for the given date and returns the existing word if found
 * @param date - Date in YYYYMMDD format
 * @returns Existing word data if found, null otherwise
 */
const checkExistingWord = (date: string): WordData | null => {
  const year = date.slice(0, 4);
  const filePath = path.join(paths.words, year, `${date}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return data as WordData;
    } catch (error) {
      logger.error('Failed to read existing word file', { filePath, error: (error as Error).message });
    }
  }
  return null;
};

/**
 * Validates that a date is not in the future
 * @param date - Date string in YYYYMMDD format
 * @returns Whether the date is today or in the past
 */
const isNotFutureDate = (date: string): boolean => {
  const today = getTodayYYYYMMDD();
  return today ? date <= today : false;
};




interface AddWordOptions {
  date?: string;
  overwrite?: boolean;
  preserveCase?: boolean;
}

/**
 * Adds a new word to the collection
 * @param input - Word to add
 * @param options - Configuration options for adding the word
 * @param options.date - Date to add word for (defaults to today)
 * @param options.overwrite - Whether to overwrite existing word
 * @param options.preserveCase - Whether to preserve original capitalization
 */
async function addWord(input: string, options: AddWordOptions = {}): Promise<void> {
  const { date, overwrite = false, preserveCase = false } = options;
  try {
    const word = input?.trim();

    // Validate inputs
    if (!word) {
      logger.error('Word is required', { providedInput: input });
      await exit(1);
    }

    if (date && !isValidDate(date)) {
      logger.error('Invalid date format', { providedDate: date, expectedFormat: 'YYYYMMDD' });
      await exit(1);
    }

    // If no date provided, use today (local timezone)
    const targetDate = date || getTodayYYYYMMDD();

    // Validate that date is not in the future
    if (!isNotFutureDate(targetDate)) {
      logger.error('Cannot add words for future dates', {
        requestedDate: targetDate,
        currentDate: getTodayYYYYMMDD(),
      });
      await exit(1);
    }

    // Check if file already exists for the target date
    const existing = checkExistingWord(targetDate);
    if (existing && !overwrite) {
      logger.error('Word already exists for this date', {
        date: existing.date,
        existingWord: existing.word,
      });
      await exit(1);
    }

    // Check if word already exists anywhere else in the system (always enforce global uniqueness)
    const existingWordByName = findExistingWord(word);
    if (existingWordByName && existingWordByName.date !== targetDate) {
      logger.error('Word already exists for different date', {
        word: word,
        existingDate: existingWordByName.date,
        requestedDate: targetDate,
      });
      await exit(1);
    }

    // Use shared word creation logic
    await createWordEntry(word, { date: targetDate, overwrite, preserveCase });

  } catch (error) {
    const err = error as Error;
    if (err.message.includes('not found in dictionary')) {
      logger.error('Word not found in dictionary', { word, errorMessage: err.message });
    } else {
      logger.error('Failed to add word', { word, errorMessage: err.message });
    }
    await exit(1);
  }
}

const HELP_TEXT = `
Add Word Tool

Usage:
  npm run tool:local tools/add-word.ts <word> [date] [options]
  npm run tool:add-word <word> [date] [options]

Arguments:
  word    The word to add (required)
  date    Date in YYYYMMDD format (optional, defaults to today)

Options:
  -o, --overwrite       Overwrite existing word if it exists
  -p, --preserve-case   Preserve original capitalization (default: converts to lowercase)
  -h, --help            Show this help message

Examples:
  npm run tool:add-word "serendipity"
  npm run tool:add-word "ephemeral" "20240116"
  npm run tool:add-word "ubiquitous" --overwrite
  npm run tool:add-word "Japan" --preserve-case
  npm run tool:add-word "PB&J" "20250101" --preserve-case

Environment Variables (for GitHub workflows):
  DICTIONARY_ADAPTER         Dictionary API to use (required)
  WORDNIK_API_KEY           API key for dictionary access (required)
  SOURCE_DIR                Data source directory (default: demo)

Requirements:
  - Word must exist in dictionary
  - Date must be today or in the past (YYYYMMDD format)
  - Tool prevents duplicate words unless --overwrite is used
${COMMON_ENV_DOCS}
`;

// Parse command line arguments
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: 'boolean', short: 'h', default: false },
    overwrite: { type: 'boolean', short: 'o', default: false },
    'preserve-case': { type: 'boolean', short: 'p', default: false },
  },
  allowPositionals: true,
  strict: true,
});

if (values.help || positionals.length === 0) {
  showHelp(HELP_TEXT);
  process.exit(0);
}

const [word, date] = positionals;

if (!word) {
  logger.error('Word is required', { word });
  showHelp(HELP_TEXT);
  process.exit(1);
}

logger.info('Add word tool starting...');
addWord(word, {
  date,
  overwrite: values.overwrite,
  preserveCase: values['preserve-case'],
}).catch(async (error: unknown) => {
  logger.error('Add word tool failed', { error: error instanceof Error ? error.message : String(error) });
  await exit(1);
});
