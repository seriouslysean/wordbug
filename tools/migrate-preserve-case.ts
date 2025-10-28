import fs from 'fs';
import { showHelp } from '~tools/help-utils';
import { getWordFiles } from '~tools/utils';
import type { WordData } from '~types';

const SOURCE_DIR = process.env.SOURCE_DIR || 'demo';

/**
 * Determines whether a word should preserve its original casing.
 * Currently we preserve words containing any uppercase characters.
 */
function shouldPreserveCase(word: string | undefined): boolean {
  if (!word) {
    return false;
  }
  return word !== word.toLowerCase();
}

/**
 * Migration tool to add preserveCase field to existing word files.
 * This is a one-time migration script that can be run once per downstream repo
 * and then removed.
 *
 * The preserveCase field was added to support words with special capitalization
 * like proper nouns ("Japan") or initialisms ("PB&J"). The migration marks
 * any word containing uppercase characters with preserveCase: true.
 */

/**
 * Migrates a single word file by adding preserveCase: false if missing
 * @param filePath - Path to the word file
 * @returns Whether the file was updated
 */
function migrateWordFile(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const wordData = JSON.parse(content) as WordData;

    const preserveCaseValue = shouldPreserveCase(wordData.word);

    // Skip if preserveCase already exists with the correct value
    if ('preserveCase' in wordData && wordData.preserveCase === preserveCaseValue) {
      return false;
    }

    const updatedData: WordData = {
      word: wordData.word,
      date: wordData.date,
      adapter: wordData.adapter,
      preserveCase: preserveCaseValue,
      data: wordData.data,
      ...(wordData.rawData && { rawData: wordData.rawData }),
    };

    // Write back with same formatting (4-space indent)
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 4));
    return true;
  } catch (error) {
    console.error('Failed to migrate file', { filePath, error: (error as Error).message });
    return false;
  }
}

/**
 * Main migration function
 */
async function migrateAllWords(): Promise<void> {
  console.log('Starting preserveCase field migration...');
  console.log(`Source directory: ${SOURCE_DIR}`);

  const files = getWordFiles();

  if (files.length === 0) {
    console.log('No word files found to migrate');
    return;
  }

  let updatedCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    const wasUpdated = migrateWordFile(file.path);
    if (wasUpdated) {
      updatedCount++;
      console.log(`Migrated: ${file.word} (${file.date})`);
    } else {
      skippedCount++;
    }
  }

  console.log('\nMigration complete!');
  console.log(`  Updated: ${updatedCount} files`);
  console.log(`  Skipped: ${skippedCount} files (already had preserveCase field)`);
  console.log(`  Total:   ${files.length} files`);
}

const HELP_TEXT = `
PreserveCase Field Migration Tool

This is a one-time migration script to add the preserveCase field to existing word files.
Words containing uppercase characters will automatically be marked with preserveCase: true.

Usage:
  npm run tool:local tools/migrate-preserve-case.ts

What it does:
  - Scans all word JSON files in the data directory
  - Adds "preserveCase": true for words containing uppercase characters
  - Adds "preserveCase": false for words without uppercase characters
  - Skips files that already have the preserveCase field
  - Preserves all other data and formatting

This script is safe to run multiple times - it will skip files that have already been migrated.

After running this migration in all downstream repos, this script can be safely deleted.
`;

// Get command line arguments
const args = process.argv.slice(2);

// Check for help flag
if (args.includes('--help') || args.includes('-h')) {
  showHelp(HELP_TEXT);
  process.exit(0);
}

console.log('PreserveCase Migration Tool');
console.log('============================\n');
migrateAllWords();
