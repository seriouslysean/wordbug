import fs from 'fs';
import opentype from 'opentype.js';
import path from 'path';
import sharp from 'sharp';

import { getAdapter } from '#adapters';
import { paths } from '#config/paths';
import type { CreateWordEntryResult, WordData } from '#types';
import { formatDate, isValidDate } from '#utils/date-utils';
import { isValidDictionaryData } from '#utils/word-validation';

// ---------------------------------------------------------------------------
// Image generation constants
// ---------------------------------------------------------------------------

const imageColors = {
  primary: process.env.COLOR_PRIMARY || '#9a3412',
  primaryLight: process.env.COLOR_PRIMARY_LIGHT || '#c2410c',
  primaryDark: process.env.COLOR_PRIMARY_DARK || '#7c2d12',
  textLighter: '#8a8f98',
};

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 630;
// 5% of shortest dimension
const PADDING = Math.floor(Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.05);
const FONT_SIZE = 160;
const TITLE_SIZE = 48;
const DATE_SIZE = 40;
// 20% of font size
const DESCENDER_OFFSET = Math.floor(FONT_SIZE * 0.2);
const MAX_WIDTH = CANVAS_WIDTH - (PADDING * 2);

const PNG_OPTIONS = {
  compressionLevel: 9,
  palette: true,
  quality: 90,
  colors: 128,
} as const;

// Load fonts - using Liberation Sans for better web compatibility
const regularFont = opentype.loadSync(path.join(paths.fonts, 'liberation-sans', 'LiberationSans-Regular.ttf'));
const boldFont = opentype.loadSync(path.join(paths.fonts, 'liberation-sans', 'LiberationSans-Bold.ttf'));

// ---------------------------------------------------------------------------
// Word file I/O
// ---------------------------------------------------------------------------

interface WordFileInfo {
  word: string;
  date: string;
  path: string;
}

/**
 * Get all word files from the data directory
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
      // File unreadable, skip
    }
  }

  return null;
}

/**
 * Gets all word data from files
 */
export function getAllWords(): WordData[] {
  return getWordFiles().flatMap(file => {
    try {
      return [JSON.parse(fs.readFileSync(file.path, 'utf-8')) as WordData];
    } catch {
      return [];
    }
  });
}

// ---------------------------------------------------------------------------
// SVG / image generation
// ---------------------------------------------------------------------------

interface TextPathResult {
  pathData: string;
  width: number;
  height: number;
  scale: number;
  transform: string;
}

interface GetTextPathOptions {
  isExtraBold?: boolean;
  maxWidth?: number;
}

function getTextPath(text: string, fontSize: number, options: GetTextPathOptions = {}): TextPathResult {
  const { isExtraBold = false, maxWidth = Infinity } = options;
  const font = isExtraBold ? boldFont : regularFont;
  const fontPath = font.getPath(text, 0, 0, fontSize);
  const bbox = fontPath.getBoundingBox();
  const width = bbox.x2 - bbox.x1;
  const scale = width > maxWidth ? maxWidth / width : 1;
  const transform = scale < 1 ? ` transform="scale(${scale})"` : '';

  return {
    pathData: fontPath.toPathData(),
    width: width * scale,
    height: (bbox.y2 - bbox.y1) * scale,
    scale,
    transform,
  };
}

/**
 * Creates an SVG social image. When date is provided, it renders below the site title.
 */
export function createSvg(text: string, date?: string): string {
  const mainWord = getTextPath(text, FONT_SIZE, { isExtraBold: true, maxWidth: MAX_WIDTH });
  const titleText = getTextPath(process.env.SITE_TITLE || '', TITLE_SIZE);
  const dateText = date ? getTextPath(formatDate(date), DATE_SIZE) : null;

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
${dateText ? `
    <!-- Date -->
    <g transform="translate(${PADDING}, ${PADDING + TITLE_SIZE + DATE_SIZE + 16})">
        <path d="${dateText.pathData}" fill="${imageColors.textLighter}"${dateText.transform}/>
    </g>
` : ''}
    <!-- Main word -->
    <g transform="translate(${PADDING}, ${CANVAS_HEIGHT - PADDING - DESCENDER_OFFSET})">
        <path d="${mainWord.pathData}" fill="url(#wordGradient)"${mainWord.transform}/>
    </g>
</svg>`;
}

/**
 * Renders SVG content to a PNG file
 */
async function renderSvgToPng(svgContent: string, outputPath: string): Promise<void> {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await sharp(Buffer.from(svgContent)).png(PNG_OPTIONS).toFile(outputPath);
}

/**
 * Generates a social share image for a word
 */
export async function generateShareImage(word: string, date: string): Promise<void> {
  const year = date.slice(0, 4);
  const outputPath = path.join(paths.images, 'social', year, `${date}-${word.toLowerCase()}.png`);
  await renderSvgToPng(createSvg(word, date), outputPath);
}

/**
 * Generates a generic social share image for pages without a word
 */
export async function generateGenericShareImage(title: string, slug: string): Promise<void> {
  const safeSlug = slug.replace(/\//g, '-');
  const outputPath = path.join(paths.images, 'social', 'pages', `${safeSlug}.png`);
  await renderSvgToPng(createSvg(title.toLowerCase()), outputPath);
}

// ---------------------------------------------------------------------------
// Word entry creation
// ---------------------------------------------------------------------------

interface CreateWordEntryOptions {
  date: string;
  overwrite?: boolean;
  preserveCase?: boolean;
}

/**
 * Creates a word data object and saves it to the appropriate file
 */
export async function createWordEntry(word: string, options: CreateWordEntryOptions): Promise<CreateWordEntryResult> {
  const { date, overwrite = false, preserveCase = false } = options;

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
  const finalWord = preserveCase ? trimmedWord : trimmedWord.toLowerCase();
  const year = date.slice(0, 4);
  const dirPath = path.join(paths.words, year);
  const filePath = path.join(dirPath, `${date}.json`);

  if (fs.existsSync(filePath) && !overwrite) {
    throw new Error(`Word already exists for date ${date}`);
  }

  fs.mkdirSync(dirPath, { recursive: true });

  // Fetch word data using finalWord (lowercased by default) so common words match
  // Wordnik entries. When preserveCase is true, original capitalization is retained.
  const adapter = getAdapter();
  const response = await adapter.fetchWordData(finalWord);
  const data = response.definitions;

  if (!isValidDictionaryData(data)) {
    throw new Error(`No valid definitions found for word: ${finalWord}`);
  }

  const wordData: WordData = {
    word: finalWord,
    date,
    adapter: process.env.DICTIONARY_ADAPTER,
    preserveCase,
    data,
  };

  fs.writeFileSync(filePath, JSON.stringify(wordData, null, 4));

  console.log('Word entry created', { word: finalWord, date });

  return { filePath, data };
}
