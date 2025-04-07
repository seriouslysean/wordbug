import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
