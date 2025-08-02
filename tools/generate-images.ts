console.log('Generate images tool starting...');

import { showHelp } from '~tools/help-utils';
import { findExistingWord, generateShareImage,getAllWords } from '~tools/utils';

const HELP_TEXT = `
Generate Images Tool

Usage:
  npm run tool:local tools/generate-images.ts [word] [options]
  npm run tool:generate-images [word] [options]

Arguments:
  word    Generate image for specific word (optional - if omitted, generates all)

Options:
  --all                      Generate images for all words (default if no word specified)
  --force                    Regenerate images even if they already exist
  -h, --help                 Show this help message

Examples:
  npm run tool:generate-images                    # Generate all images
  npm run tool:generate-images serendipity       # Generate image for specific word
  npm run tool:generate-images --all --force     # Regenerate all images

Environment Variables (for GitHub workflows):
  SOURCE_DIR                 Data source directory (default: demo)
  SITE_TITLE                 Site title for images
  COLOR_PRIMARY             Primary color for gradients
  COLOR_PRIMARY_LIGHT       Light primary color
  COLOR_PRIMARY_DARK        Dark primary color

Requirements:
  - Word must exist in data files
  - Required environment variables must be set
  - Output directory will be created if it doesn't exist
`;

/**
 * Generates image for a specific word
 */
async function generateSingleImage(word: string): Promise<boolean> {
  try {
    const wordData = findExistingWord(word);
    if (!wordData) {
      console.error('Word not found in data files', { word });
      return false;
    }

    await generateShareImage(word, wordData.date);
    console.log('Generated image for word', { word, date: wordData.date });
    return true;
  } catch (error) {
    console.error('Error generating image for word', { word, error: (error as Error).message });
    return false;
  }
}

/**
 * Generates images for all words
 */
async function generateAllImages(): Promise<void> {
  const allWords = getAllWords();
  console.log('Starting bulk image generation', { wordCount: allWords.length });

  let successCount = 0;
  let errorCount = 0;

  for (const wordData of allWords) {
    try {
      await generateShareImage(wordData.word, wordData.date);
      console.log('Generated image', { word: wordData.word, date: wordData.date });
      successCount++;
    } catch (error) {
      console.error('Error generating image', {
        word: wordData.word,
        date: wordData.date,
        error: (error as Error).message,
      });
      errorCount++;
    }
  }

  console.log('Bulk image generation complete', {
    total: allWords.length,
    success: successCount,
    errors: errorCount,
  });
}

// Parse command line arguments
const args = process.argv.slice(2);

// Check for help flag
if (args.includes('--help') || args.includes('-h')) {
  showHelp(HELP_TEXT);
  process.exit(0);
}

// Parse options
const forceIndex = args.findIndex(arg => arg === '--force');
const hasForce = forceIndex !== -1;
if (hasForce) {
  args.splice(forceIndex, 1);
}

const allIndex = args.findIndex(arg => arg === '--all');
const hasAll = allIndex !== -1;
if (hasAll) {
  args.splice(allIndex, 1);
}

const [word] = args;

// Main execution
(async () => {
  try {
    if (word && !hasAll) {
      // Generate single word image
      const success = await generateSingleImage(word);
      process.exit(success ? 0 : 1);
    } else {
      // Generate all images
      await generateAllImages();
      process.exit(0);
    }
  } catch (error) {
    console.error('Tool execution failed', { error: (error as Error).message });
    process.exit(1);
  }
})();