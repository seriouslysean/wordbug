import { createWordSvg, getAllWords } from './utils.js';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

async function generateWordImages() {
	const words = getAllWords();
	const outputDir = path.join(process.cwd(), 'public', 'images', 'social');

	for (const word of words) {
		const year = word.date.slice(0, 4);
		const yearDir = path.join(outputDir, year);
		await fs.mkdir(yearDir, { recursive: true });

		const svg = createWordSvg(word.word, word.date);
		const outputPath = path.join(yearDir, `${word.date}-${word.word}.png`);

		try {
			await sharp(Buffer.from(svg))
				.png({
					compressionLevel: 9,
					palette: true,
					quality: 90,
					colors: 128
				})
				.toFile(outputPath);
			console.log(`Generated image for ${word.word} (${word.date}) in ${yearDir}`);
		} catch (error) {
			console.error(`Error generating image for ${word.word}:`, error);
		}
	}
}

generateWordImages().catch(console.error);
