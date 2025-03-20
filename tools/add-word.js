import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Checks if a file exists for the given date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {boolean} - Whether the file exists
 */
const checkFileExists = (date) => {
    const [year, month, day] = date.split('-');
    const filePath = path.join(__dirname, '..', 'src', 'data', 'words', year, `${year}${month}${day}.json`);
    if (fs.existsSync(filePath)) {
        console.log(`A word already exists for ${date}`);
        return true;
    }
    return false;
};

/**
 * Creates a word file for the given date and word data
 * @param {string} word - Word to add
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Object} data - Word data from API
 */
const createWordFile = (word, date, data) => {
    const [year] = date.split('-');
    const dirPath = path.join(__dirname, '..', 'src', 'data', 'words', year);
    const filePath = path.join(dirPath, `${date.replace(/-/g, '')}.json`);

    // Create year directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    // Write the file
    fs.writeFileSync(filePath, JSON.stringify({ ...data, date }, null, 4));
    console.log(`Created word file: ${filePath}`);
};

/**
 * Validates a date string
 * @param {string} date - Date string to validate
 * @returns {boolean} - Whether the date is valid
 */
const isValidDate = (date) => {
    if (!date) return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(date)) return false;
    const d = new Date(date);
    return d instanceof Date && !isNaN(d);
};

/**
 * Fetches word data from the Free Dictionary API
 * @param {string} word - Word to fetch data for
 * @returns {Promise<Object>} - Word data from API
 * @throws {Error} - If API request fails
 */
async function fetchWordData(word) {
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
 * Adds a new word to the collection
 * @param {string} word - Word to add
 * @param {string} [date] - Optional date to add word for
 * @param {boolean} [overwrite] - Whether to overwrite existing word
 */
async function addWord(word, date, overwrite = false) {
    try {
        // Validate inputs
        if (!word?.trim()) {
            throw new Error('Word is required');
        }
        if (date && !isValidDate(date)) {
            throw new Error('Invalid date format. Use YYYY-MM-DD');
        }

        // If no date provided, use today
        const targetDate = date || new Date().toISOString().split('T')[0];

        // Check if file already exists
        if (checkFileExists(targetDate) && !overwrite) {
            process.exit(1);
        }

        const data = await fetchWordData(word);
        createWordFile(word, targetDate, data);
        console.log(`Successfully added word: ${word} for date: ${targetDate}`);
    } catch (error) {
        console.error('Error adding word:', error.message);
        process.exit(1);
    }
}

// Get command line arguments
const args = process.argv.slice(2);
const overwriteIndex = args.findIndex(arg => arg === '--overwrite' || arg === '-o');
const hasOverwrite = overwriteIndex !== -1;

// Remove the overwrite flag from args if present
if (hasOverwrite) {
    args.splice(overwriteIndex, 1);
}

const [word, date] = args;

addWord(word, date, hasOverwrite);
