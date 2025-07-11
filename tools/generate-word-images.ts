import { getAllWords, createWordSvg, isUsingDemoWords } from './word-data-utils';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { paths } from '~config/paths';

/**
 * Generates social share images for all words in the collection
 * Creates PNG files from SVG templates for each word
 */
async function generateWordImages(): Promise<void> {
  const words = getAllWords();
  const usingDemo = isUsingDemoWords();
  const baseOutputDir = usingDemo
    ? path.join(paths.images, 'social', 'demo')
    : path.join(paths.images, 'social');

  console.log(`Generating images for ${words.length} words (${usingDemo ? 'demo' : 'production'} mode)`);

  for (const word of words) {
    const year = word.date.slice(0, 4);
    const yearDir = path.join(baseOutputDir, year);
    await fs.mkdir(yearDir, { recursive: true });

    const svg = createWordSvg(word.word, word.date);
    const outputPath = path.join(yearDir, `${word.date}-${word.word}.png`);

    try {
      await sharp(Buffer.from(svg))
        .png({
          compressionLevel: 9,
          palette: true,
          quality: 90,
          colors: 128,
        })
        .toFile(outputPath);
      console.log(`Generated image for ${word.word} (${word.date}) in ${yearDir}`);
    } catch (error) {
      console.error(`Error generating image for ${word.word}:`, error);
    }
  }
}

generateWordImages().catch(console.error);
