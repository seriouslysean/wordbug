import { generateShareImage,getAllWords } from '~tools/utils';

/**
 * Generates social share images for all words in the collection
 * Creates PNG files from SVG templates for each word
 */
async function generateWordImages(): Promise<void> {
  const allWords = getAllWords();
  console.log(`Generating images for ${allWords.length} words`);

  for (const word of allWords) {
    try {
      await generateShareImage(word.word, word.date);
      console.log(`Generated image for ${word.word} (${word.date})`);
    } catch (error) {
      console.error(`Error generating image for ${word.word}:`, error);
    }
  }
}

generateWordImages().catch(console.error);
