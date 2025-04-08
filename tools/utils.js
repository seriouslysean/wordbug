import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import opentype from 'opentype.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
const regularFont = opentype.loadSync('public/fonts/opensans/OpenSans-Regular.ttf');
const boldFont = opentype.loadSync('public/fonts/opensans/OpenSans-ExtraBold.ttf');

/**
 * Gets all word files from the data directory
 * @returns {Array<{word: string, date: string, path: string}>}
 */
export function getAllWordFiles() {
    const wordsDir = path.join(process.cwd(), 'src', 'data', 'words');
    const years = fs.readdirSync(wordsDir).filter(dir => /^\d{4}$/.test(dir));

    return years.flatMap(year => {
        const yearDir = path.join(wordsDir, year);
        return fs.readdirSync(yearDir)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(yearDir, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                return {
                    word: data.word,
                    date: file.replace('.json', ''),
                    path: filePath
                };
            });
    });
}

/**
 * Gets all words with their data from the data directory
 * @returns {Array<{word: string, date: string, data: Object}>}
 */
export function getAllWords() {
    return getAllWordFiles().map(file => {
        const data = JSON.parse(fs.readFileSync(file.path, 'utf-8'));
        return {
            ...data,
            date: file.date
        };
    }).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Updates a word file with new data
 * @param {string} filePath - Path to the word file
 * @param {Object} data - Word data
 * @param {string} date - Date string in YYYYMMDD format
 */
export function updateWordFile(filePath, data, date) {
    const wordData = {
        word: data.word,
        date: date,
        data: data
    };
    fs.writeFileSync(filePath, JSON.stringify(wordData, null, 4));
    console.log(`Updated word file: ${filePath}`);
}

/**
 * Fetches word data from the Free Dictionary API
 * @param {string} word - Word to fetch data for
 * @returns {Promise<Object>} - Word data from API
 * @throws {Error} - If API request fails
 */
export async function fetchWordData(word) {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch word data: ${response.statusText}`);
    }
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No word data found');
    }
    return data[0];
}

/**
 * Creates a directory if it doesn't already exist
 * @param {string} dir - Directory path to create
 */
export function createDirectoryIfNeeded(dir) {
    !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true });
}

/**
 * Gets a word by its name from the data directory
 * @param {string} word - Word to find
 * @returns {Object|null} - Word data or null if not found
 */
export function getWordByName(word) {
    const words = getAllWords();
    return words.find(w => w.word.toLowerCase() === word.toLowerCase()) || null;
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
export function createWordSvg(word, date) {
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
 * Generates a social share image for a word
 * @param {string} word - The word to generate an image for
 * @param {string} date - Date string in YYYYMMDD format
 */
export async function generateShareImage(word, date) {
    const year = date.slice(0, 4);
    const socialDir = path.join(process.cwd(), 'public', 'images', 'social', year);
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
                colors: 128
            })
            .toFile(outputPath);
    } catch (error) {
        throw new Error(`Error generating image for "${word}": ${error.message}`);
    }
}

/**
 * Creates a generic SVG template for pages without a word
 * @param {string} title - The title to display
 * @returns {string} - SVG content as a string
 */
export function createGenericSvg(title) {
    // Get path data for all text elements
    const mainWord = getTextPath(title.toLowerCase(), FONT_SIZE, true, MAX_WIDTH);
    const titleText = getTextPath("Bug's (Occasional) Word of the Day", TITLE_SIZE);

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

    <!-- Main word -->
    <g transform="translate(${PADDING}, ${CANVAS_HEIGHT - PADDING - DESCENDER_OFFSET})">
        <path d="${mainWord.pathData}" fill="url(#wordGradient)"${mainWord.transform}/>
    </g>
</svg>`;
}

/**
 * Generates a generic social share image for pages without a word
 * @param {string} title - The title to use in the image
 * @param {string} slug - The page slug/path
 */
export async function generateGenericShareImage(title, slug) {
    const socialDir = path.join(process.cwd(), 'public', 'images', 'social', 'pages');
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
                colors: 128
            })
            .toFile(outputPath);
    } catch (error) {
        throw new Error(`Error generating generic image for "${title}": ${error.message}`);
    }
}
