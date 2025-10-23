import fs from 'fs';
import opentype from 'opentype.js';
import path from 'path';
import sharp from 'sharp';

import { paths } from '~config/paths';

// Colors for image generation
const imageColors = {
  primary: process.env.COLOR_PRIMARY || '#9a3412',
  primaryLight: process.env.COLOR_PRIMARY_LIGHT || '#c2410c',
  primaryDark: process.env.COLOR_PRIMARY_DARK || '#7c2d12',
  textLighter: '#8a8f98',
};


// Constants for image generation
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 630;
const PADDING = Math.floor(Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.05);  // 5% of shortest dimension
const FONT_SIZE = 160;
const TITLE_SIZE = 48;
const DATE_SIZE = 40;
const DESCENDER_OFFSET = Math.floor(FONT_SIZE * 0.2);  // Restore descender offset (20% of font size)
const MAX_WIDTH = CANVAS_WIDTH - (PADDING * 2);

// Load fonts - using Liberation Sans for better web compatibility
const regularFont = opentype.loadSync(path.join(paths.fonts, 'liberation-sans', 'LiberationSans-Regular.ttf'));
const boldFont = opentype.loadSync(path.join(paths.fonts, 'liberation-sans', 'LiberationSans-Bold.ttf'));


interface WordFileInfo {
  word: string;
  date: string;
  path: string;
}

/**
 * Get all word files from the data directory
 * @returns {WordFileInfo[]} Array of word file information objects
 */
export const getWordFiles = (): WordFileInfo[] => {
  if (!fs.existsSync(paths.words)) {
    console.error('Word directory does not exist', { path: paths.words });
    return [];
  }

  const years = fs.readdirSync(paths.words).filter(dir => /^\d{4}$/.test(dir));

  if (years.length === 0) {
    console.error('No year directories found', { path: paths.words });
    return [];
  }

  const files = years.flatMap(year => {
    try {
      const yearDir = path.join(paths.words, year);
      const jsonFiles = fs.readdirSync(yearDir)
        .filter(file => file.endsWith('.json'));

      return jsonFiles.map(file => {
        try {
          const filePath = path.join(yearDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          return {
            word: data.word,
            date: file.replace('.json', ''),
            path: filePath,
          };
        } catch (error) {
          console.error('Failed to read word file', { file, error: (error as Error).message });
          return null;
        }
      }).filter(Boolean) as WordFileInfo[];
    } catch (error) {
      console.error('Failed to read year directory', { year, error: (error as Error).message });
      return [];
    }
  });

  // Sort by date (newest first) for consistency
  return files.sort((a, b) => b.date.localeCompare(a.date));
};



/**
 * Updates a word file with new dictionary data
 * @param filePath - Path to the word file
 * @param data - Wordnik API response data
 * @param date - Date string in YYYYMMDD format
 * @returns {void} Nothing
 */
export function updateWordFile(filePath: string, data: WordnikResponse, date: string): void {
  if (!data.length || !data[0].word) {
    throw new Error('No word found in response data');
  }

  const word = data[0].word.toLowerCase();
  const adapter = process.env.DICTIONARY_ADAPTER || 'wordnik';
  const wordData = { word, date, adapter, data };

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(wordData, null, 4));
  console.log('Updated word file', { filePath });
}


/**
 * Creates a directory if it doesn't already exist
 * @param dir - Directory path to create
 * @returns {void} Nothing
 */
export function createDirectoryIfNeeded(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Checks if a word already exists by scanning word files
 * @param word - Word to check (case-insensitive)
 * @returns Existing word data if found, null otherwise
 */
export function findExistingWord(word: string): WordData | null {
  const lowerWord = word.toLowerCase();
  const files = getWordFiles();

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(file.path, 'utf-8')) as WordData;
      if (data.word?.toLowerCase() === lowerWord) {
        return data;
      }
    } catch {
      // Skip corrupted files
      continue;
    }
  }

  return null;
}

/**
 * Gets all word data from files
 * @returns Array of all word data
 */
export function getAllWords(): WordData[] {
  const files = getWordFiles();
  const words: WordData[] = [];

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(file.path, 'utf-8')) as WordData;
      words.push(data);
    } catch {
      // Skip corrupted files
      continue;
    }
  }

  return words;
}


/**
 * Converts text to SVG path data with proper scaling
 * @param text - Text to convert
 * @param fontSize - Font size for the text
 * @param isExtraBold - Whether to use ExtraBold weight
 * @param maxWidth - Maximum width allowed for the text
 * @returns Path data and dimensions object
 */
interface TextPathResult {
  pathData: string;
  width: number;
  height: number;
  scale: number;
  transform: string;
}

function getTextPath(text: string, fontSize: number, isExtraBold: boolean = false, maxWidth: number = Infinity): TextPathResult {
  // Use the appropriate font based on weight
  const font = isExtraBold ? boldFont : regularFont;

  // Create the path at the original size
  const path = font.getPath(text, 0, 0, fontSize);

  // Get the bounding box
  const bbox = path.getBoundingBox();
  const width = bbox.x2 - bbox.x1;

  // Calculate scale if needed
  const scale = width > maxWidth ? maxWidth / width : 1;

  // If we need to scale, apply it via transform attribute
  const transform = scale < 1 ? ` transform="scale(${scale})"` : '';

  return {
    pathData: path.toPathData(),
    width: width * scale,
    height: (bbox.y2 - bbox.y1) * scale,
    scale,
    transform,
  };
}

/**
 * Creates an SVG template for a word with its date
 * @param word - The word to create an image for
 * @param date - Date string in YYYYMMDD format
 * @returns SVG content as a string
 */
export function createWordSvg(word: string, date: string): string {
  const formattedDate = formatDate(date);

  // Get path data for all text elements
  const mainWord = getTextPath(word.toLowerCase(), FONT_SIZE, true, MAX_WIDTH);
  const titleText = getTextPath(process.env.SITE_TITLE || '', TITLE_SIZE);
  const dateText = getTextPath(formattedDate, DATE_SIZE);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <!-- White background -->
    <rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="#ffffff"/>

    <defs>
        <linearGradient id="wordGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${imageColors.primaryLight}"/>
            <stop offset="60%" stop-color="${imageColors.primary}"/>
            <stop offset="100%" stop-color="${imageColors.primaryDark}"/>
        </linearGradient>
    </defs>

    <!-- Site title -->
    <g transform="translate(${PADDING}, ${PADDING + TITLE_SIZE})">
        <path d="${titleText.pathData}" fill="${imageColors.textLighter}"${titleText.transform}/>
    </g>

    <!-- Date -->
    <g transform="translate(${PADDING}, ${PADDING + TITLE_SIZE + DATE_SIZE + 16})">
        <path d="${dateText.pathData}" fill="${imageColors.textLighter}"${dateText.transform}/>
    </g>

    <!-- Main word -->
    <g transform="translate(${PADDING}, ${CANVAS_HEIGHT - PADDING - DESCENDER_OFFSET})">
        <path d="${mainWord.pathData}" fill="url(#wordGradient)"${mainWord.transform}/>
    </g>
</svg>`;
}


/**
 * Generates a social share image for a word
 * @param word - The word to generate an image for
 * @param date - Date string in YYYYMMDD format
 * @returns {Promise<void>} Nothing
 */
export async function generateShareImage(word: string, date: string): Promise<void> {
  const year = date.slice(0, 4);
  const socialDir = path.join(paths.images, 'social', year);

  createDirectoryIfNeeded(socialDir);

  const svgContent = createWordSvg(word, date);
  const fileName = `${date}-${word.toLowerCase()}.png`;
  const outputPath = path.join(socialDir, fileName);

  try {
    await sharp(Buffer.from(svgContent))
      .png({
        compressionLevel: 9,
        palette: true,
        quality: 90,
        colors: 128,
      })
      .toFile(outputPath);
  } catch (error) {
    throw new Error(`Error generating image for "${word}": ${error.message}`);
  }
}

/**
 * Creates a generic SVG template for pages without a word
 * @param title - The title to display
 * @returns SVG content as a string
 */
export function createGenericSvg(title: string): string {
  // Get path data for all text elements
  const mainWord = getTextPath(title.toLowerCase(), FONT_SIZE, true, MAX_WIDTH);
  const titleText = getTextPath(process.env.SITE_TITLE || '', TITLE_SIZE);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <!-- White background -->
    <rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="#ffffff"/>

    <defs>
        <linearGradient id="wordGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${imageColors.primaryLight}"/>
            <stop offset="60%" stop-color="${imageColors.primary}"/>
            <stop offset="100%" stop-color="${imageColors.primaryDark}"/>
        </linearGradient>
    </defs>

    <!-- Site title -->
    <g transform="translate(${PADDING}, ${PADDING + TITLE_SIZE})">
        <path d="${titleText.pathData}" fill="${imageColors.textLighter}"${titleText.transform}/>
    </g>

    <!-- Main word -->
    <g transform="translate(${PADDING}, ${CANVAS_HEIGHT - PADDING - DESCENDER_OFFSET})">
        <path d="${mainWord.pathData}" fill="url(#wordGradient)"${mainWord.transform}/>
    </g>
</svg>`;
}

/**
 * Generates a generic social share image for pages without a word
 * @param title - The title to use in the image
 * @param slug - The page slug/path
 * @returns {Promise<void>} Nothing
 */
export async function generateGenericShareImage(title: string, slug: string): Promise<void> {
  const socialDir = path.join(paths.images, 'social', 'pages');
  createDirectoryIfNeeded(socialDir);

  const svgContent = createGenericSvg(title);
  const safeSlug = slug.replace(/\//g, '-');
  const outputPath = path.join(socialDir, `${safeSlug}.png`);

  try {
    await sharp(Buffer.from(svgContent))
      .png({
        compressionLevel: 9,
        palette: true,
        quality: 90,
        colors: 128,
      })
      .toFile(outputPath);
  } catch (error) {
    throw new Error(`Error generating generic image for "${title}": ${error.message}`);
  }
}

import { getAdapter } from '~adapters';
import type { CreateWordEntryResult, WordData, WordnikResponse } from '~types';
import { formatDate, isValidDate } from '~utils/date-utils';
import { isValidDictionaryData } from '~utils/word-validation';


/**
 * Creates a word data object and saves it to the appropriate file
 * @param word - Word to add
 * @param date - Date in YYYYMMDD format
 * @param overwrite - Whether to overwrite existing files
 * @returns Object with file path and word data
 */
export async function createWordEntry(word: string, date: string, overwrite: boolean = false): Promise<CreateWordEntryResult> {
  // Validate inputs
  if (!word?.trim()) {
    throw new Error('Word is required');
  }

  if (!isValidDate(date)) {
    throw new Error(`Invalid date format: ${date}. Expected YYYYMMDD format`);
  }

  if (!process.env.DICTIONARY_ADAPTER) {
    throw new Error('DICTIONARY_ADAPTER environment variable is required');
  }

  const trimmedWord = word.trim();
  const originalWord = trimmedWord; // Preserve original capitalization
  const lowercaseWord = trimmedWord.toLowerCase();
  const year = date.slice(0, 4);
  const dirPath = path.join(paths.words, year);
  const filePath = path.join(dirPath, `${date}.json`);

  // Check if file already exists
  if (fs.existsSync(filePath) && !overwrite) {
    throw new Error(`Word already exists for date ${date}`);
  }

  // Create year directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Fetch word data using the configured adapter (with original capitalization)
  const adapter = getAdapter();
  const response = await adapter.fetchWordData(originalWord);
  const data = response.definitions;

  // Validate the word data before saving
  if (!isValidDictionaryData(data)) {
    throw new Error(`No valid definitions found for word: ${originalWord}`);
  }

  const wordData: WordData = {
    word: lowercaseWord,
    date,
    adapter: process.env.DICTIONARY_ADAPTER,
    data,
  };

  // Add displayWord only if capitalization differs from lowercase
  if (originalWord !== lowercaseWord) {
    wordData.displayWord = originalWord;
  }

  fs.writeFileSync(filePath, JSON.stringify(wordData, null, 4));

  console.log('Word entry created', { word: originalWord, date });

  return { filePath, data };
}

