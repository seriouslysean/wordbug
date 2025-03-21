import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
 * Gets all word files from the data directory
 * @returns {Array<{word: string, date: string, path: string}>}
 */
function getAllWordFiles() {
    const wordsDir = path.join(process.cwd(), 'src', 'data', 'words');
    const years = fs.readdirSync(wordsDir).filter(dir => /^\d{4}$/.test(dir));

    return years.flatMap(year => {
        const yearDir = path.join(wordsDir, year);
        return fs.readdirSync(yearDir)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(yearDir, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                const word = data.word;
                return {
                    word,
                    date: file.replace('.json', ''),
                    path: filePath
                };
            });
    });
}

/**
 * Updates a word file with new API data
 * @param {string} filePath - Path to the word file
 * @param {Object} data - New word data from API
 * @param {string} date - Date string
 */
function updateWordFile(filePath, data, date) {
    const wordData = {
        word: data.word,
        date: date,
        data: data
    };
    fs.writeFileSync(filePath, JSON.stringify(wordData, null, 4));
    console.log(`Updated word file: ${filePath}`);
}

async function reprocessWords() {
    try {
        const wordFiles = getAllWordFiles();
        console.log(`Found ${wordFiles.length} words to reprocess`);

        for (const file of wordFiles) {
            try {
                console.log(`Fetching data for: ${file.word}`);
                const data = await fetchWordData(file.word);
                updateWordFile(file.path, data, file.date);
                // Add a small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Error processing ${file.word}:`, error.message);
            }
        }

        console.log('Finished reprocessing words');
    } catch (error) {
        console.error('Error reprocessing words:', error.message);
        process.exit(1);
    }
}

reprocessWords();
