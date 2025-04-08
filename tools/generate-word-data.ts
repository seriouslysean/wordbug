import { getAllWordFiles, fetchWordData, updateWordFile } from './utils.js';

/**
 * Reprocesses all word data with fresh API data
 * @returns {Promise<void>}
 */
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
