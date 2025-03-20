import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const getWordFiles = (year) => {
    if (!year) return [];

    const wordsDir = path.join(__dirname, '..', 'data', 'words', year);
    if (!fs.existsSync(wordsDir)) return [];

    return fs.readdirSync(wordsDir)
        .filter(file => file.endsWith('.json'))
        .map(file => ({
            name: file,
            date: file.replace('.json', ''),
            path: path.join(wordsDir, file)
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
};

const readWordFile = (filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return null;

    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        // Handle both array responses (old format) and object responses (new format)
        return Array.isArray(data) ? data[0] : data;
    } catch (error) {
        console.error(`Error reading word file ${filePath}:`, error);
        return null;
    }
};

const getAllWords = () => {
    try {
        const wordsDir = path.join(__dirname, '..', 'data', 'words');
        const years = fs.readdirSync(wordsDir)
            .filter(dir => /^\d{4}$/.test(dir));

        return years.flatMap(year =>
            getWordFiles(year)
                .map(file => {
                    const word = readWordFile(file.path);
                    return word ? { ...word, date: file.date } : null;
                })
                .filter(Boolean)
        ).sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
        throw error;
    }
};

/**
 * Gets the current word (most recent word not after today)
 * @returns {Object} The current word object
 */
export const getCurrentWord = () => {
    try {
        const words = getAllWords();
        if (!words.length) throw new Error('No word data available');

        const today = new Date();
        const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');

        // Find the closest word that's not after today
        return words.find(word => word.date <= dateString) || words[0];
    } catch (error) {
        throw error;
    }
};

/**
 * Gets the past words before the given date
 * @param {string} currentDate - The reference date in YYYYMMDD format
 * @returns {Array} Array of past word objects
 */
export const getPastWords = (currentDate) => {
    try {
        if (!currentDate) return [];

        const words = getAllWords();
        return words
            .filter(word => word.date < currentDate)
            .slice(0, 5);
    } catch (error) {
        return [];
    }
};

/**
 * Gets a word by its date
 * @param {string} date - The date in YYYYMMDD format
 * @returns {Object|null} The word object or null if not found
 */
export const getWordByDate = (date) => {
    try {
        if (!date) return null;

        const words = getAllWords();
        return words.find(word => word.date === date) || null;
    } catch (error) {
        return null;
    }
};

/**
 * Gets the previous and next words relative to the given date
 * @param {string} date - The reference date in YYYYMMDD format
 * @returns {Object} Object containing previousWord and nextWord
 */
export const getAdjacentWords = (date) => {
    try {
        if (!date) return { previousWord: null, nextWord: null };

        const words = getAllWords();
        const currentIndex = words.findIndex(word => word.date === date);

        if (currentIndex === -1) return { previousWord: null, nextWord: null };

        return {
            previousWord: words[currentIndex + 1] || null,
            nextWord: words[currentIndex - 1] || null
        };
    } catch (error) {
        return { previousWord: null, nextWord: null };
    }
};

/**
 * Safely extracts word details from the word object
 * @param {Object} word - Word object containing meanings and definitions
 * @returns {Object} - Extracted word details
 */
export const getWordDetails = (word) => {
    if (!word || !word.meanings || !word.meanings.length) {
        return { partOfSpeech: '', definition: '' };
    }

    const firstMeaning = word.meanings[0];
    if (!firstMeaning) {
        return { partOfSpeech: '', definition: '' };
    }

    const partOfSpeech = firstMeaning.partOfSpeech ? `${firstMeaning.partOfSpeech}.` : '';
    const definitions = firstMeaning.definitions || [];
    const firstDefinition = definitions[0] || {};
    const definition = firstDefinition.definition || '';

    // Only add a period if there's a definition and it doesn't already end with one
    const formattedDefinition = definition ? (definition.endsWith('.') ? definition : `${definition}.`) : '';

    return { partOfSpeech, definition: formattedDefinition };
};
