import { generateShareImage } from './utils';
import { getWordByName } from './utils';

const [,, word] = process.argv;

if (!word) {
    console.error('Usage: node tools/generate-word-image.js <word>');
    process.exit(1);
}

try {
    const wordData = await getWordByName(word);
    if (!wordData) {
        console.error(`Word "${word}" not found in data files`);
        process.exit(1);
    }

    await generateShareImage(word, wordData.date);
    console.log(`Generated social share image for "${word}" (${wordData.date})`);
} catch (error: unknown) {
    if (error instanceof Error) {
        console.error(`Error generating image for "${word}":`, error.message);
    } else {
        console.error(`Error generating image for "${word}":`, String(error));
    }
    process.exit(1);
}
