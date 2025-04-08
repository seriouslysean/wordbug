import { generateGenericShareImage, getStaticPages } from './utils';
import fs from 'fs';
import path from 'path';

/**
 * Generate social images for all static pages
 */
async function generateGenericImages() {
    const staticPages = getStaticPages();

    // Get all year directories from the words data
    const wordsDir = path.join(process.cwd(), 'src', 'data', 'words');
    const years = fs.readdirSync(wordsDir).filter(dir => /^\d{4}$/.test(dir));

    // Add year pages and words index
    const wordPages = [
        { title: 'All Words', path: 'words' },
        ...years.map(year => ({
            title: `${year} Words`,
            path: `words/${year}`
        }))
    ];

    // Filter out index, dynamic word pages, and 404 (we'll add it manually)
    const nonWordPages = staticPages.filter(page =>
        page.path !== '' && // exclude index
        !page.path.includes('[') && // exclude dynamic routes
        !page.path.includes('words/index') && // exclude words index (we add it manually)
        page.path !== '404' // exclude 404 (we'll add it manually)
    );

    // Add special pages that don't follow the normal pattern
    const specialPages = [
        { title: '404', path: '404' }
    ];

    const allPages = [...nonWordPages, ...wordPages, ...specialPages];

    for (const page of allPages) {
        try {
            await generateGenericShareImage(page.title, page.path);
            console.log(`Generated generic image for "${page.title}" (${page.path})`);
        } catch (error) {
            console.error(`Error generating image for "${page.title}":`, error);
        }
    }
}

// Run if called directly
if (import.meta.url.endsWith(process.argv[1])) {
    generateGenericImages();
}

export { generateGenericImages };
