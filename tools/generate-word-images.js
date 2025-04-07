import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import opentype from 'opentype.js';
import { getAllWords, createDirectoryIfNeeded } from './utils.js';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 630;
const PADDING = Math.floor(Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.05);  // 5% of shortest dimension
const FONT_SIZE = 160;
const TITLE_SIZE = 32;
const DATE_SIZE = 32;
const DESCENDER_OFFSET = Math.floor(FONT_SIZE * 0.2);  // Restore descender offset (20% of font size)
const MAX_WIDTH = CANVAS_WIDTH - (PADDING * 2);

// Load fonts
const regularFont = opentype.loadSync('public/fonts/opensans/OpenSans-Regular.ttf');
const boldFont = opentype.loadSync('public/fonts/opensans/OpenSans-ExtraBold.ttf');

/**
 * Formats a date string from YYYYMMDD to Month D, YYYY
 * @param {string} dateStr - Date in YYYYMMDD format
 * @returns {string} - Formatted date
 */
function formatDate(dateStr) {
    const year = dateStr.slice(0, 4);
    const month = parseInt(dateStr.slice(4, 6)) - 1;
    const day = parseInt(dateStr.slice(6, 8));
    const date = new Date(year, month, day);
    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Convert text to SVG path data with proper scaling
 * @param {string} text - Text to convert
 * @param {number} fontSize - Font size for the text
 * @param {boolean} isExtraBold - Whether to use ExtraBold weight
 * @param {number} maxWidth - Maximum width allowed for the text
 * @returns {Object} - Path data and dimensions
 */
function getTextPath(text, fontSize, isExtraBold = false, maxWidth = Infinity) {
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
        transform
    };
}

/**
 * Creates an SVG template for a word with its date
 * @param {string} word - The word to create an image for
 * @param {string} date - Date string in YYYYMMDD format
 * @returns {string} - SVG content as a string
 */
function createWordSvg(word, date) {
    const formattedDate = formatDate(date);

    // Get path data for all text elements
    const mainWord = getTextPath(word.toLowerCase(), FONT_SIZE, true, MAX_WIDTH);
    const titleText = getTextPath("Bug's (Occasional) Word of the Day", TITLE_SIZE);
    const dateText = getTextPath(formattedDate, DATE_SIZE);

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <!-- White background -->
    <rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="#ffffff"/>

    <defs>
        <linearGradient id="wordGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3a8f96"/>
            <stop offset="60%" stop-color="#2A6F74"/>
            <stop offset="100%" stop-color="#1d4e51"/>
        </linearGradient>
    </defs>

    <!-- Site title -->
    <g transform="translate(${PADDING}, ${PADDING + TITLE_SIZE})">
        <path d="${titleText.pathData}" fill="#8a8f98"${titleText.transform}/>
    </g>

    <!-- Date -->
    <g transform="translate(${PADDING}, ${PADDING + TITLE_SIZE + DATE_SIZE + 16})">
        <path d="${dateText.pathData}" fill="#8a8f98"${dateText.transform}/>
    </g>

    <!-- Main word -->
    <g transform="translate(${PADDING}, ${CANVAS_HEIGHT - PADDING - DESCENDER_OFFSET})">
        <path d="${mainWord.pathData}" fill="url(#wordGradient)"${mainWord.transform}/>
    </g>
</svg>`;
}

/**
 * Generates a social share image for a word
 * @param {string} word - The word to generate an image for
 * @param {string} date - Date string in YYYYMMDD format
 */
async function generateShareImage(word, date) {
  const socialDir = path.join(process.cwd(), 'public', 'images', 'social');
  createDirectoryIfNeeded(socialDir);

  const svgContent = createWordSvg(word, date);
  const fileName = `${date}-${word}.png`;
  const outputPath = path.join(socialDir, fileName);

  try {
    await sharp(Buffer.from(svgContent))
      .png({
        compressionLevel: 9,
        palette: true,
        quality: 90,
        colors: 128
      })
      .toFile(outputPath);
    console.log(`Generated social share image for "${word}" (${date})`);
  } catch (error) {
    console.error(`Error generating image for "${word}":`, error.message);
  }
}

/**
 * Generates social share images for all words
 */
async function generateWordImages() {
  try {
    const words = getAllWords();
    console.log(`Found ${words.length} words to generate images for`);

    for (const wordData of words) {
      try {
        await generateShareImage(wordData.word, wordData.date);
        // Add a small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing ${wordData.word}:`, error.message);
      }
    }

    console.log('Finished generating social share images');
  } catch (error) {
    console.error('Error generating images:', error.message);
    process.exit(1);
  }
}

generateWordImages();
