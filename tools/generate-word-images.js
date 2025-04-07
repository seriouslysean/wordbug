import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { getAllWords, createDirectoryIfNeeded } from './utils.js';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 630;
const PADDING = Math.floor(Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.05);  // Equal padding all around (5% of smaller dimension)
const FONT_SIZE = 160;
const TITLE_SIZE = 32;  // Larger title font (title text is ~19 chars, should take ~50% width)
const DATE_SIZE = 16;   // Date font size
const DESCENDER_OFFSET = Math.floor(FONT_SIZE * 0.2);  // Account for descenders (g, j, p, q, y)
const MAX_WIDTH = CANVAS_WIDTH - (PADDING * 2);

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
 * Estimates if a word will overflow the max width
 * @param {string} word - The word to check
 * @returns {boolean} - True if the word would overflow
 */
function willWordOverflow(word) {
    // Rough estimate: each character is ~0.7x the font size in width
    const estimatedWidth = word.length * (FONT_SIZE * 0.7);
    return estimatedWidth > MAX_WIDTH;
}

/**
 * Calculates the appropriate font size for a word to fit the width
 * @param {string} word - The word to size
 * @param {number} maxWidth - Maximum width in pixels
 * @returns {number} - Calculated font size
 */
function calculateFontSize(word, maxWidth = 1080) {  // 1200 - (PADDING * 2)
    // Rough estimate: each character is ~0.7x the font size in width
    const estimatedWidth = word.length * (FONT_SIZE * 0.7);
    if (estimatedWidth <= maxWidth) return FONT_SIZE;

    return Math.floor(FONT_SIZE * (maxWidth / estimatedWidth));
}

/**
 * Creates an SVG template for a word with its date
 * @param {string} word - The word to create an image for
 * @param {string} date - Date string in YYYYMMDD format
 * @returns {string} - SVG content as a string
 */
function createWordSvg(word, date) {
    const needsScaling = willWordOverflow(word);
    const textLengthAttr = needsScaling ? `textLength="${MAX_WIDTH}" lengthAdjust="spacingAndGlyphs"` : '';
    const formattedDate = formatDate(date);

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
    <text
        x="${PADDING}" y="${PADDING + TITLE_SIZE}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${TITLE_SIZE}"
        font-weight="600"
        fill="#8a8f98"
        style="text-transform: lowercase; letter-spacing: 0.5px;">
        Bug's (Occasional) Word of the Day
    </text>

    <!-- Date -->
    <text
        x="${PADDING}" y="${PADDING + TITLE_SIZE + TITLE_SIZE + 16}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${TITLE_SIZE}"
        fill="#8a8f98"
        style="letter-spacing: 0.5px;">
        ${formattedDate}
    </text>

    <!-- Main word - positioned at bottom with consistent padding and descender offset -->
    <text
        x="${PADDING}"
        y="${CANVAS_HEIGHT - PADDING - DESCENDER_OFFSET}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${FONT_SIZE}"
        font-weight="800"
        fill="url(#wordGradient)"
        ${textLengthAttr}
        style="letter-spacing: -0.02em; text-transform: lowercase;">
        ${word}
    </text>
</svg>`;
}

/**
 * Generates a social share image for a word
 * @param {string} word - The word to generate an image for
 * @param {string} date - Date string in YYYYMMDD format
 * @returns {Promise<void>}
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
 * @returns {Promise<void>}
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
