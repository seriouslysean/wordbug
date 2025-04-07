import { getAllWords, generateShareImage } from './utils.js';

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
