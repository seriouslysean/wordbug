import fs from 'fs';
import opentype from 'opentype.js';
import path from 'path';
import sharp from 'sharp';

import { paths } from '~config/paths';
// Colors for image generation
const imageColors = {
  primary: process.env.COLOR_PRIMARY || '#4a5d4a',
  primaryLight: process.env.COLOR_PRIMARY_LIGHT || '#5a6d5a',
  primaryDark: process.env.COLOR_PRIMARY_DARK || '#3a4d3a',
  textLighter: '#8a8f98',
};
import { logger } from '~utils/logger';


// Constants for image generation
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 630;
const PADDING = Math.floor(Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.05);  // 5% of shortest dimension
const FONT_SIZE = 160;
const TITLE_SIZE = 48;
const DATE_SIZE = 40;
const DESCENDER_OFFSET = Math.floor(FONT_SIZE * 0.2);  // Restore descender offset (20% of font size)
const MAX_WIDTH = CANVAS_WIDTH - (PADDING * 2);

// Load fonts
const regularFont = opentype.loadSync(path.join(paths.fonts, 'opensans', 'OpenSans-Regular.ttf'));
const boldFont = opentype.loadSync(path.join(paths.fonts, 'opensans', 'OpenSans-ExtraBold.ttf'));

/**
 * Checks if the app is using demo words (no real words available)
 * @returns true if using demo words, false if real words exist
 */
export function isUsingDemoWords(): boolean {
  if (!fs.existsSync(paths.words)) {
    return true;
  }

  try {
    const years = fs.readdirSync(paths.words).filter(dir => /^\d{4}$/.test(dir));
    return !years.some(year => {
      const yearDir = path.join(paths.words, year);
      return fs.existsSync(yearDir) && fs.readdirSync(yearDir).length > 0;
    });
  } catch {
    return true;
  }
}

/**
 * Gets all word files from the data directory
 * @returns Array of word file information objects
 */
interface WordFileInfo {
  word: string;
  date: string;
  path: string;
}

const getWordFilesFromDirectory = (searchDir: string): WordFileInfo[] => {
  if (!fs.existsSync(searchDir)) {
    logger.error('Directory does not exist', { searchDir });
    return [];
  }

  const years = fs.readdirSync(searchDir).filter(dir => /^\d{4}$/.test(dir));

  if (years.length === 0) {
    logger.error('No year directories found', { searchDir });
    return [];
  }

  return years.flatMap(year => {
    try {
      const yearDir = path.join(searchDir, year);
      const files = fs.readdirSync(yearDir)
        .filter(file => file.endsWith('.json'));

      if (files.length === 0) {
        logger.warn('No word files found in year directory', { yearDir });
        return [];
      }

      return files.map(file => {
        try {
          const filePath = path.join(yearDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          return {
            word: data.word,
            date: file.replace('.json', ''),
            path: filePath,
          };
        } catch (error) {
          logger.error('Error reading word file', { file, error: (error as Error).message });
          return null;
        }
      })
      .filter(Boolean) as WordFileInfo[];
    } catch (error) {
      logger.error('Error reading year directory', { year, error: (error as Error).message });
      return [];
    }
  });
};

export function getAllWordFiles(): WordFileInfo[] {
  try {
    // Try to get words from the main words directory
    if (fs.existsSync(paths.words)) {
      const files = getWordFilesFromDirectory(paths.words);
      // If we found some files, return them
      if (files.length > 0) {
        return files;
      }
    }

    // If we get here, either:
    // 1. paths.words doesn't exist, or
    // 2. paths.words exists but is empty
    // In both cases, we should fall back to demo words
    if (fs.existsSync(paths.demoWords)) {
      logger.info('Using demo words directory', { path: paths.demoWords });
      return getWordFilesFromDirectory(paths.demoWords);
    }

    logger.error('No word directories found', {
      wordsPath: paths.words,
      demoPath: paths.demoWords,
    });
    return [];
  } catch (error) {
    logger.error('Error getting word files', { error: (error as Error).message });
    return [];
  }
}

/**
 * Gets all words with their data from the data directory
 * @returns Array of word data objects sorted by date (newest first)
 */
export const getAllWords = (): WordData[] => {
  try {
    return getAllWordFiles()
      .map(file => {
        try {
          const data = JSON.parse(fs.readFileSync(file.path, 'utf-8'));
          return { ...data, date: file.date };
        } catch (error) {
          logger.error('Error parsing word file', { path: file.path, error: (error as Error).message });
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    logger.error('Error getting all words', { error: (error as Error).message });
    return [];
  }
};

/**
 * Gets all available years from word data
 * @returns Array of year strings sorted newest to oldest
 */
export const getAvailableYears = (): string[] => {
  const words = getAllWords();
  const years = [...new Set(words.map(word => word.date.slice(0, 4)))];
  return years.sort((a, b) => b.localeCompare(a));
};

/**
 * Updates a word file with new dictionary data
 * @param filePath - Path to the word file
 * @param data - Wordnik API response data
 * @param date - Date string in YYYYMMDD format
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
  logger.info('Updated word file', { filePath });
}


/**
 * Creates a directory if it doesn't already exist
 * @param dir - Directory path to create
 */
export function createDirectoryIfNeeded(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Gets a word by its name from the data directory
 * @param word - Word to find (case-insensitive)
 * @returns Word data or null if not found
 */
export function getWordByName(word: string): WordData | null {
  const words = getAllWords();
  return words.find(w => w.word.toLowerCase() === word.toLowerCase()) || null;
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
 */
export async function generateShareImage(word: string, date: string): Promise<void> {
  const year = date.slice(0, 4);

  // Use demo directory if we're using demo words
  const socialDir = isUsingDemoWords()
    ? path.join(paths.images, 'social', 'demo', year)
    : path.join(paths.images, 'social', year);

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

import type { WordData } from '~types/word';
import type { WordnikResponse } from '~types/wordnik';
import { formatDate } from '~utils/date-utils';
import { isValidDictionaryData } from '~utils/word-data-utils';
export { isValidDictionaryData as isValidWordData };

// Re-export generateWordDataHash from utils for convenience
export { generateWordDataHash } from '~utils/word-data-utils';

