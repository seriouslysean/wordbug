import fs from 'fs';
import path from 'path';

const getWordFiles = (year) => {
    if (!year) return [];

    const wordsDir = path.join(process.cwd(), 'src', 'data', 'words', year);
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
    const years = fs.readdirSync(path.join(process.cwd(), 'src', 'data', 'words'))
        .filter(dir => /^\d{4}$/.test(dir));

    return years.flatMap(year =>
        getWordFiles(year)
            .map(file => ({ ...readWordFile(file.path), date: file.date }))
            .filter(Boolean)
    ).sort((a, b) => b.date.localeCompare(a.date));
};

/**
 * Gets the current word (most recent word not after today)
 * @returns {Object} The current word object
 */
export const getCurrentWord = () => {
    const words = getAllWords();
    if (!words.length) throw new Error('No word data available');

    const today = new Date();
    const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Find the closest word that's not after today
    return words.find(word => word.date <= dateString) || words[0];
};

/**
 * Gets the past words before the given date
 * @param {string} currentDate - The reference date in YYYYMMDD format
 * @returns {Array} Array of past word objects
 */
export const getPastWords = (currentDate) => {
    if (!currentDate) return [];

    const words = getAllWords();
    return words
        .filter(word => word.date < currentDate)
        .slice(0, 5);
};

/**
 * Gets a word by its date
 * @param {string} date - The date in YYYYMMDD format
 * @returns {Object|null} The word object or null if not found
 */
export const getWordByDate = (date) => {
    if (!date) return null;

    const words = getAllWords();
    return words.find(word => word.date === date) || null;
};

/**
 * Gets the previous and next words relative to the given date
 * @param {string} date - The reference date in YYYYMMDD format
 * @returns {Object} Object containing previousWord and nextWord
 */
export const getAdjacentWords = (date) => {
    if (!date) return { previousWord: null, nextWord: null };

    const words = getAllWords();
    const currentIndex = words.findIndex(word => word.date === date);

    if (currentIndex === -1) return { previousWord: null, nextWord: null };

    return {
        previousWord: words[currentIndex + 1] || null,
        nextWord: words[currentIndex - 1] || null
    };
};

/**
 * Safely extracts word details from the word object
 * @param {Object} word - Word object containing meanings and definitions
 * @returns {Object} - Extracted word details
 */
export const getWordDetails = (word) => {
    if (!word) return { partOfSpeech: '', definition: '' };

    const meanings = word.meanings || [];
    const firstMeaning = meanings[0] || {};
    const definitions = firstMeaning.definitions || [];
    const firstDefinition = definitions[0] || {};

    const partOfSpeech = firstMeaning.partOfSpeech ? `${firstMeaning.partOfSpeech}.` : '';
    const definition = firstDefinition.definition || '';
    // Only add a period if the definition doesn't already end with one
    const formattedDefinition = definition.endsWith('.') ? definition : `${definition}.`;

    return { partOfSpeech, definition: formattedDefinition };
};
