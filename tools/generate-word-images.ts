import { generateShareImage, getAllWords, isUsingDemoWords } from '~tools/utils';

/**
 * Generates social share images for all words in the collection
 * Creates PNG files from SVG templates for each word
 */
async function generateWordImages(): Promise<void> {
  const words = getAllWords();
  const usingDemo = isUsingDemoWords();

  console.log(`Generating images for ${words.length} words (${usingDemo ? 'demo' : 'production'} mode)`);

  for (const word of words) {
    try {
      await generateShareImage(word.word, word.date);
      console.log(`Generated image for ${word.word} (${word.date})`);
    } catch (error) {
      console.error(`Error generating image for ${word.word}:`, error);
    }
  }
}

generateWordImages().catch(console.error);
