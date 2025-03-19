import { generateShareImage, getWordByName } from '~tools/utils';

/**
 * Command-line script to generate a social share image for a specific word
 * Usage: node tools/generate-word-image.js <word>
 */

const [,, word] = process.argv;

if (!word) {
  console.error('Usage: node tools/generate-word-image.js <word>');
  process.exit(1);
}

try {
  const wordData = getWordByName(word);
  if (!wordData) {
    console.error(`Word "${word}" not found in data files`);
    process.exit(1);
  }

  await generateShareImage(word, wordData.date);
  console.log(`Generated social share image for "${word}" (${wordData.date})`);
} catch (error) {
  console.error(`Error generating image for "${word}":`, error.message);
  process.exit(1);
}
