import { isEntryPoint } from '#tools/entry';
import { COMMON_ENV_DOCS, parseToolArgs, showHelp } from '#tools/help-utils';
import { createWordEntry, findSlugCollision, findWordInFiles, getWordFiles } from '#tools/utils';
import { getTodayYYYYMMDD, isValidDate } from '#utils/date-utils';
import { isNotDisplayable, isWordNotFound } from '#utils/adapter-utils';
import { exit, getErrorMessage, logger } from '#utils/logger';
import { slugify } from '#utils/text-utils';

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
export async function addWord(input: string, options: AddWordOptions = {}): Promise<void> {
  const { date, overwrite = false, preserveCase = false } = options;
  const word = input?.trim();
  // Refusals of the operator's input log at warn: the CLI logger forwards
  // only error-level calls to Sentry, and a typo is not an application fault
  try {
    if (!word) {
      logger.warn('Word is required', { providedInput: input });
      await exit(1);
    }

    // The word page lives at /word/<slug>. A word with no slug ("&", "日本")
    // would be written to /word/ itself.
    if (!slugify(word)) {
      logger.warn('Word has no URL slug', {
        word,
        reason: 'A slug keeps only ASCII letters, digits, underscores and hyphens, and this word has none',
      });
      await exit(1);
    }

    if (date && !isValidDate(date)) {
      logger.warn('Invalid date format', { providedDate: date, expectedFormat: 'YYYYMMDD' });
      await exit(1);
    }

    // If no date provided, use today (local timezone)
    const targetDate = date || getTodayYYYYMMDD();

    // Validate that date is not in the future
    if (!isNotFutureDate(targetDate)) {
      logger.warn('Cannot add words for future dates', {
        requestedDate: targetDate,
        currentDate: getTodayYYYYMMDD(),
      });
      await exit(1);
    }

    // One scan answers the date, word and slug checks and the write below, so
    // a file that cannot be read is reported once. A new site has no words
    // yet, so an empty corpus is not a fault here.
    const scan = getWordFiles({ allowEmpty: true });

    // A date is held by whichever file stores it: the site builds every
    // .json file below the words directory, not only <year>/<date>.json
    const existing = scan.files.find(file => file.date === targetDate);
    if (existing && !overwrite) {
      logger.warn('Word already exists for this date', {
        date: existing.date,
        existingWord: existing.word,
      });
      await exit(1);
    }

    // Check if word already exists anywhere else in the system (always enforce global uniqueness)
    const { match: existingWordByName } = findWordInFiles(word, scan);
    if (existingWordByName && existingWordByName.date !== targetDate) {
      logger.warn('Word already exists for different date', {
        word: word,
        existingDate: existingWordByName.date,
        requestedDate: targetDate,
      });
      await exit(1);
    }

    // A different word with the same slug ("can't" beside "cant") would claim
    // the same page, and only one of the two could be built.
    const slugCollision = findSlugCollision(word, targetDate, scan.files);
    if (slugCollision) {
      logger.warn('Word shares its URL slug with a different word', {
        word,
        slug: slugify(word),
        existingWord: slugCollision.word,
        existingDate: slugCollision.date,
      });
      await exit(1);
    }

    // Use shared word creation logic
    await createWordEntry(word, { date: targetDate, overwrite, preserveCase, files: scan.files });

  } catch (error) {
    const errorMessage = getErrorMessage(error);
    // "Not found" only when every adapter said so; a rate limit or shape error
    // from one of them is a different problem and is reported as such
    if (isWordNotFound(error)) {
      logger.warn('Word not found in dictionary', { word, errorMessage });
    } else if (isNotDisplayable(error)) {
      // The dictionary has it, as a phrase, an affix or a symbol: the word
      // is one the site cannot show, which is input, not a fault
      logger.warn('Word has no definition the site can display', { word, errorMessage });
    } else {
      logger.error('Failed to add word', { word, errorMessage });
    }
    await exit(1);
  }
}

const HELP_TEXT = `
Add Word Tool

Usage:
  npm run tool:local tools/add-word.ts -- <word> [date] [options]
  npm run tool:add-word -- <word> [date] [options]

Arguments:
  word    The word to add (required)
  date    Date in YYYYMMDD format (optional, defaults to today)

Options:
  -o, --overwrite       Replace the word already stored for the date
  -p, --preserve-case   Preserve original capitalization (default: converts to lowercase).
                        Needed for an entry a dictionary spells with a capital: the
                        word is looked up as it will be stored, and Wiktionary's
                        titles are case-sensitive ("Japan" is found, "japan" is not)
  -h, --help            Show this help message

Examples:
  npm run tool:add-word "serendipity"
  npm run tool:add-word "ephemeral" "20240116"
  npm run tool:add-word -- "ubiquitous" --overwrite
  npm run tool:add-word -- "Japan" --preserve-case
  npm run tool:add-word -- "PB&J" "20250101" --preserve-case

Requirements:
  - Word must exist in dictionary
  - Date must be today or in the past (YYYYMMDD format)
  - A date holds one word: a date that already has one is refused unless
    --overwrite is used, which replaces it
  - A word is stored once: one already stored on another date is refused,
    with or without --overwrite
  - A word needs a URL slug (ASCII letters, digits, underscores and hyphens):
    one with none is refused, and so is one whose slug a different word on
    another date has ("can't" beside "cant"), with or without --overwrite
${COMMON_ENV_DOCS}
`;

if (isEntryPoint(import.meta.url)) {
  const { values, positionals } = await parseToolArgs({
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
    logger.warn('Word is required', { word });
    showHelp(HELP_TEXT);
    await exit(1);
  } else {
    logger.info('Add word tool starting...');
    addWord(word, {
      date,
      overwrite: values.overwrite,
      preserveCase: values['preserve-case'],
    }).catch(async (error: unknown) => {
      logger.error('Add word tool failed', { error: getErrorMessage(error) });
      await exit(1);
    });
  }
}
