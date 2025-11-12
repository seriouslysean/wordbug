import fs from 'fs';
import path from 'path';

import { paths } from '~config/paths';
import { COMMON_ENV_DOCS,showHelp } from '~tools/help-utils';
import { createWordEntry, findExistingWord } from '~tools/utils';
import type { WordData } from '~types';
import { getTodayYYYYMMDD, isValidDate } from '~utils/date-utils';

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
      console.error('Failed to read existing word file', { filePath, error: (error as Error).message });
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
      console.error('Word is required', { providedInput: input });
      process.exit(1);
    }

    if (date && !isValidDate(date)) {
      console.error('Invalid date format', { providedDate: date, expectedFormat: 'YYYYMMDD' });
      process.exit(1);
    }

    // If no date provided, use today (local timezone)
    const targetDate = date || getTodayYYYYMMDD();

    // Validate that date is not in the future
    if (!isNotFutureDate(targetDate)) {
      console.error('Cannot add words for future dates', {
        requestedDate: targetDate,
        currentDate: getTodayYYYYMMDD(),
      });
      process.exit(1);
    }

    // Check if file already exists for the target date
    const existing = checkExistingWord(targetDate);
    if (existing && !overwrite) {
      console.error('Word already exists for this date', {
        date: existing.date,
        existingWord: existing.word,
      });
      process.exit(1);
    }

    // Check if word already exists anywhere else in the system (always enforce global uniqueness)
    const existingWordByName = findExistingWord(word);
    if (existingWordByName && existingWordByName.date !== targetDate) {
      console.error('Word already exists for different date', {
        word: word,
        existingDate: existingWordByName.date,
        requestedDate: targetDate,
      });
      process.exit(1);
    }

    // Use shared word creation logic
    await createWordEntry(word, { date: targetDate, overwrite, preserveCase });

  } catch (error) {
    if (error.message.includes('not found in dictionary')) {
      console.error('Word not found in dictionary', { word, errorMessage: error.message });
    } else {
      console.error('Failed to add word', { word, errorMessage: error.message });
    }
    process.exit(1);
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

// Get command line arguments
const args = process.argv.slice(2);

// Check for help flag
if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  showHelp(HELP_TEXT);
  process.exit(0);
}

// Parse options - check and remove each flag immediately
const overwriteIndex = args.findIndex(arg => arg === '--overwrite' || arg === '-o');
const hasOverwrite = overwriteIndex !== -1;
if (hasOverwrite) {
  args.splice(overwriteIndex, 1);
}

const preserveCaseIndex = args.findIndex(arg => arg === '--preserve-case' || arg === '-p');
const hasPreserveCase = preserveCaseIndex !== -1;
if (hasPreserveCase) {
  args.splice(preserveCaseIndex, 1);
}

const [word, date] = args;

if (!word) {
  console.error('Word is required', { word });
  showHelp(HELP_TEXT);
  process.exit(1);
}

console.log('Add word tool starting...');
addWord(word, {
  date,
  overwrite: hasOverwrite,
  preserveCase: hasPreserveCase,
});
