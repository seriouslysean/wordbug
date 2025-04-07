import { generateGenericShareImage } from './utils.js';
import { getStaticPages } from '../src/utils/page-utils.js';

const [,, pagePath] = process.argv;

if (!pagePath) {
    console.error('Usage: node tools/generate-page-image.js <page-path>');
    process.exit(1);
}

async function generatePageImage() {
    const staticPages = getStaticPages();
    const page = staticPages.find(p => p.path === pagePath);

    if (!page) {
        console.error(`Page "${pagePath}" not found in static pages`);
        process.exit(1);
    }

    try {
        await generateGenericShareImage(page.title, page.path);
        console.log(`Generated social image for "${page.title}" (${page.path})`);
    } catch (error) {
        console.error(`Error generating image for "${page.title}":`, error);
        process.exit(1);
    }
}

generatePageImage().catch(console.error);
