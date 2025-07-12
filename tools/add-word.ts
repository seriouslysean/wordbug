import fs from 'fs';
import path from 'path';

import { getAdapter } from '~adapters/factory';
import { paths } from '~config/paths';
import { getAllWords } from '~tools/word-data-utils';
import type { DictionaryDefinition } from '~types/adapters';
import type { WordData } from '~types/word';
import { isValidDateISO } from '~utils/date-utils';
import { logger } from '~utils/logger';
import { isValidDictionaryData } from '~utils/word-data-utils';

/**
 * Checks if a file exists for the given date and returns the existing word if found
 * @param date - Date in YYYY-MM-DD format
 * @returns Existing word data if found, null otherwise
 */
const checkExistingWord = (date: string): WordData | null => {
  const [year, month, day] = date.split('-');
  const filePath = path.join(paths.words, year, `${year}${month}${day}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return data as WordData;
    } catch (error) {
      logger.error('Error reading existing word file', { filePath, error: (error as Error).message });
    }
  }
  return null;
};

/**
 * Creates a word file for the given date and word data
 * @param word - Word to add
 * @param date - Date in YYYY-MM-DD format
 * @param data - Dictionary definitions from API
 * @returns Path to created file
 */
const createWordFile = (word: string, date: string, data: DictionaryDefinition[]): string => {
  const [year] = date.split('-');
  const dirPath = path.join(paths.words, year);
  const filePath = path.join(dirPath, `${date.replace(/-/g, '')}.json`);

  // Create year directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const wordData: WordData = {
    word: word.toLowerCase(),
    date: date.replace(/-/g, ''),
    adapter: process.env.DICTIONARY_ADAPTER || 'wordnik',
    data,
  };
  fs.writeFileSync(filePath, JSON.stringify(wordData, null, 4));
  return filePath;
};

/**
 * Gets the current date in YYYY-MM-DD format using local timezone
 * @returns Current date string in YYYY-MM-DD format
 */
const getCurrentLocalDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Validates that a date is not in the future
 * @param date - Date string in YYYY-MM-DD format
 * @returns Whether the date is today or in the past
 */
const isNotFutureDate = (date: string): boolean => {
  const today = getCurrentLocalDate();
  return date <= today;
};

/**
 * Checks if a word already exists in any date
 * @param word - Word to check
 * @returns Existing word data if found, null otherwise
 */
const checkExistingWordByName = (word: string): WordData | null => {
  const lowerWord = word.toLowerCase();
  const words = getAllWords();
  return words.find(w => w.word?.toLowerCase() === lowerWord) || null;
};


/**
 * Formats dictionary definitions for summary output
 * @param data - Dictionary definitions array
 * @returns Formatted summary string
 */
const formatWordSummary = (data: DictionaryDefinition[]): string => {
  if (!data || !Array.isArray(data)) {
    return 'Word: No data available';
  }

  const firstEntry = data[0] || {};

  return [
    `Part of Speech: ${firstEntry.partOfSpeech || 'N/A'}`,
    `Definition: ${firstEntry.text || 'N/A'}`,
    firstEntry.attributionText ? `Source: ${firstEntry.attributionText}` : null,
  ].filter(Boolean).join('\n');
};

/**
 * Adds a new word to the collection
 * @param input - Word to add
 * @param date - Date to add word for (defaults to today)
 * @param overwrite - Whether to overwrite existing word
 */
async function addWord(input: string, date: string, overwrite: boolean = false): Promise<void> {
  try {
    const word = input?.trim();

    // Validate inputs
    if (!word) {
      logger.error('Word is required', { providedInput: input });
      process.exit(1);
    }

    if (date && !isValidDateISO(date)) {
      logger.error('Invalid date format', { providedDate: date, expectedFormat: 'YYYY-MM-DD' });
      process.exit(1);
    }

    // If no date provided, use today (local timezone)
    const targetDate = date || getCurrentLocalDate();

    // Validate that date is not in the future
    if (!isNotFutureDate(targetDate)) {
      logger.error('Cannot add words for future dates', {
        requestedDate: targetDate,
        currentDate: getCurrentLocalDate(),
      });
      process.exit(1);
    }

    // Check if file already exists for the target date
    const existing = checkExistingWord(targetDate);
    if (existing && !overwrite) {
      logger.error('Word already exists for this date', {
        date: existing.date,
        existingWord: existing.word,
      });
      process.exit(1);
    }

    // Check if word already exists anywhere else in the system (not same date)
    const existingWordByName = checkExistingWordByName(word);
    if (existingWordByName && existingWordByName.date !== targetDate.replace(/-/g, '') && !overwrite) {
      logger.error('Word already exists for different date', {
        word: word,
        existingDate: existingWordByName.date,
        requestedDate: targetDate.replace(/-/g, ''),
      });
      process.exit(1);
    }

    // Fetch word data using the configured adapter
    const adapter = getAdapter();
    const response = await adapter.fetchWordData(word);
    // The adapter returns a DictionaryResponse with definitions in generic format
    const data = response.definitions;
    const adapterName = adapter.name;

    // Validate the word data before saving
    if (!isValidDictionaryData(data)) {
      logger.error('Invalid word data received from adapter', { word, adapter: adapterName });
      throw new Error(`No valid definitions found for word: ${word}`);
    }

    const filePath = createWordFile(word, targetDate, data);
    logger.info('Word added successfully', {
      word,
      date: targetDate,
      adapter: adapterName,
      filePath,
    });

    // Output summary for GitHub Actions (using console for workflow output)
    console.log('::group::Word Added Successfully');
    console.log(`New Word Added for ${targetDate}`);
    console.log(formatWordSummary(data));
    console.log(`File created: ${filePath}`);
    console.log('::endgroup::');

  } catch (error) {
    if (error.message.includes('not found in dictionary')) {
      logger.error('Word not found in dictionary', { word, errorMessage: error.message });
    } else {
      logger.error('Failed to add word', { word, errorMessage: error.message });
    }
    process.exit(1);
  }
}

function showHelp(): void {
  console.log(`
Add Word Tool

Usage:
  npm run tool:add-word <word> [date] [options]

Arguments:
  word    The word to add (required)
  date    Date in YYYY-MM-DD format (optional, defaults to today)

Options:
  -o, --overwrite    Overwrite existing word if it exists
  -h, --help         Show this help message

Examples:
  npm run tool:add-word "serendipity"
  npm run tool:add-word "ephemeral" "2024-01-16"
  npm run tool:add-word "ubiquitous" --overwrite

Requirements:
  - Word must exist in Wordnik dictionary
  - Date must be today or in the past
  - Tool prevents duplicate words unless --overwrite is used\n`);
}

// Get command line arguments
const args = process.argv.slice(2);

// Check for help flag
if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  showHelp();
  process.exit(0);
}

const overwriteIndex = args.findIndex(arg => arg === '--overwrite' || arg === '-o');
const hasOverwrite = overwriteIndex !== -1;

// Remove the overwrite flag from args if present
if (hasOverwrite) {
  args.splice(overwriteIndex, 1);
}

const [word, date] = args;

if (!word) {
  logger.error('Error: Word is required');
  showHelp();
  process.exit(1);
}

addWord(word, date, hasOverwrite);
