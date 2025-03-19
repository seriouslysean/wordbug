import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Validates a date string is in YYYY-MM-DD format
 * @param {string} date - Date string to validate
 * @returns {boolean} - True if date is valid
 */
function isValidDate(date) {
    if (!date) return true; // Allow empty date for today
    const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
    if (!DATE_FORMAT.test(date)) return false;

    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    return dateObj.getFullYear() === year &&
           dateObj.getMonth() === month - 1 &&
           dateObj.getDate() === day;
}

/**
 * Checks if a word file already exists for the given date
 * @param {string} date - Date to check
 * @returns {boolean} - True if file exists
 */
function checkFileExists(date) {
    const formattedDate = new Date(date).toISOString().split('T')[0];
    const year = formattedDate.substring(0, 4);
    const fileName = `${formattedDate.replace(/-/g, '')}.json`;
    const filePath = path.join(process.cwd(), 'src', 'data', 'words', year, fileName);

    if (fs.existsSync(filePath)) {
        console.error(`Error: A word already exists for ${formattedDate}`);
        return true;
    }
    return false;
}

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
 * Creates a word file with the provided data
 * @param {string} word - Word to save
 * @param {string} date - Date to save word for
 * @param {Object} data - Word data from API
 */
function createWordFile(word, date, data) {
    const formattedDate = new Date(date).toISOString().split('T')[0];
    const year = formattedDate.substring(0, 4);
    const yearDir = path.join(process.cwd(), 'src', 'data', 'words', year);

    // Create year directory if it doesn't exist
    if (!fs.existsSync(yearDir)) {
        fs.mkdirSync(yearDir, { recursive: true });
    }

    const fileName = `${formattedDate.replace(/-/g, '')}.json`;
    const filePath = path.join(yearDir, fileName);

    // Save the complete dictionary response and add the date
    const wordData = {
        ...data,
        date: formattedDate
    };

    fs.writeFileSync(filePath, JSON.stringify(wordData, null, 4));
    console.log(`Created word file: ${filePath}`);
}

/**
 * Adds a new word to the collection
 * @param {string} word - Word to add
 * @param {string} [date] - Optional date to add word for
 */
async function addWord(word, date) {
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
        if (checkFileExists(targetDate)) {
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

// Get word from command line argument
const word = process.argv[2];
const date = process.argv[3];

if (!word) {
    console.error('Please provide a word as an argument');
    process.exit(1);
}

addWord(word, date);
