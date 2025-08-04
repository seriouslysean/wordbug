import { showHelp } from '~tools/help-utils';
import { findExistingWord, generateGenericShareImage, generateShareImage, getAllWords } from '~tools/utils';
import { getStaticPages } from '~utils-client/image-utils';
import { getAvailableYears } from '~utils-client/word-data-utils';

const HELP_TEXT = `
Generate Images Tool

Usage:
  npm run tool:local tools/generate-images.ts [word|page] [options]
  npm run tool:generate-images [word|page] [options]

Arguments:
  word    Generate image for specific word (optional - if omitted, generates all)
  page    Generate image for specific page path (with --page flag)

Options:
  --all                      Generate images for all words (default if no word specified)
  --generic                  Generate images for all generic pages (stats, words index, etc.)
  --page <path>              Generate image for specific page path
  --force                    Regenerate images even if they already exist
  -h, --help                 Show this help message

Examples:
  npm run tool:generate-images                    # Generate all word images
  npm run tool:generate-images serendipity       # Generate image for specific word
  npm run tool:generate-images --all --force     # Regenerate all word images
  npm run tool:generate-images --generic          # Generate all generic page images
  npm run tool:generate-images --page stats       # Generate image for stats page

Environment Variables (for GitHub workflows):
  SOURCE_DIR                 Data source directory (default: demo)
  SITE_TITLE                 Site title for images
  COLOR_PRIMARY             Primary color for gradients
  COLOR_PRIMARY_LIGHT       Light primary color
  COLOR_PRIMARY_DARK        Dark primary color

Requirements:
  - Word must exist in data files for word images
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

/**
 * Generates images for all generic pages (stats, words index, year pages, etc.)
 */
async function generateGenericImages(): Promise<void> {
  const staticPages = getStaticPages();

  // Get all available years from word data
  const years = getAvailableYears();

  // Add year pages and words index
  const wordPages = [
    { title: 'All Words', path: 'words' },
    ...years.map(year => ({
      title: `${year} Words`,
      path: `words/${year}`,
    })),
  ];

  // Filter out index, dynamic word pages, and 404 (we'll add it manually)
  const nonWordPages = staticPages.filter(page =>
    page.path !== '' && // exclude index
    !page.path.includes('[') && // exclude dynamic routes
    !page.path.includes('words/index') && // exclude words index (we add it manually)
    page.path !== '404', // exclude 404 (we'll add it manually)
  );

  // Add special pages that don't follow the normal pattern
  const specialPages = [
    { title: '404', path: '404' },
  ];

  const allPages = [...nonWordPages, ...wordPages, ...specialPages];

  console.log('Starting generic image generation', { pageCount: allPages.length });

  let successCount = 0;
  let errorCount = 0;

  for (const page of allPages) {
    try {
      await generateGenericShareImage(page.title, page.path);
      console.log('Generated generic image', { title: page.title, path: page.path });
      successCount++;
    } catch (error) {
      console.error('Error generating generic image', {
        title: page.title,
        path: page.path,
        error: (error as Error).message,
      });
      errorCount++;
    }
  }

  console.log('Generic image generation complete', {
    total: allPages.length,
    success: successCount,
    errors: errorCount,
  });
}

/**
 * Generates image for a specific page path
 */
async function generatePageImage(pagePath: string): Promise<boolean> {
  try {
    const staticPages = getStaticPages();
    const page = staticPages.find(p => p.path === pagePath);

    if (!page) {
      console.error('Page not found in static pages', { pagePath });
      return false;
    }

    await generateGenericShareImage(page.title, page.path);
    console.log('Generated page image', { title: page.title, path: page.path });
    return true;
  } catch (error) {
    console.error('Error generating page image', { pagePath, error: (error as Error).message });
    return false;
  }
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

const genericIndex = args.findIndex(arg => arg === '--generic');
const hasGeneric = genericIndex !== -1;
if (hasGeneric) {
  args.splice(genericIndex, 1);
}

const pageIndex = args.findIndex(arg => arg === '--page');
const hasPage = pageIndex !== -1;
let pagePath = '';
if (hasPage) {
  args.splice(pageIndex, 1);
  pagePath = args.splice(pageIndex, 1)[0] || '';
}

const [word] = args;

// Main execution
(async () => {
  try {
    console.log('Generate images tool starting...');

    if (hasPage && pagePath) {
      // Generate specific page image
      const success = await generatePageImage(pagePath);
      process.exit(success ? 0 : 1);
    } else if (hasGeneric) {
      // Generate all generic page images
      await generateGenericImages();
      process.exit(0);
    } else if (word && !hasAll) {
      // Generate single word image
      const success = await generateSingleImage(word);
      process.exit(success ? 0 : 1);
    } else {
      // Generate all word images
      await generateAllImages();
      process.exit(0);
    }
  } catch (error) {
    console.error('Tool execution failed', { error: (error as Error).message });
    process.exit(1);
  }
})();