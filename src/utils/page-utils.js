import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Gets all static pages that need generic social images
 * @returns {Array<{title: string, path: string}>}
 */
export function getStaticPages() {
    const pages = [];
    const pagesDir = path.join(__dirname, '..', 'pages');

    function scanDirectory(dir, basePath = '') {
        const entries = fs.readdirSync(dir);

        for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            const relativePath = path.join(basePath, entry);
            const stats = fs.statSync(fullPath);

            if (stats.isDirectory()) {
                scanDirectory(fullPath, relativePath);
            } else if (entry.endsWith('.astro')) {
                // Skip dynamic routes and index pages
                if (entry.includes('[') || entry.includes(']') || entry === 'index.astro') {
                    continue;
                }

                // Get the page content to extract the title
                const content = fs.readFileSync(fullPath, 'utf-8');
                const titleMatch = content.match(/title:\s*["'](.*?)["']/);
                const title = titleMatch ? titleMatch[1] :
                    path.basename(entry, '.astro').replace(/-/g, ' ');

                // Get the URL path
                const urlPath = relativePath
                    .replace('.astro', '')
                    .replace(/\\/g, '/'); // Convert Windows paths to forward slashes

                pages.push({
                    title,
                    path: urlPath
                });
            }
        }
    }

    // Scan pages directory
    scanDirectory(pagesDir);

    // Get all year directories from the words data for year pages
    const wordsDir = path.join(process.cwd(), 'src', 'data', 'words');
    const years = fs.readdirSync(wordsDir).filter(dir => /^\d{4}$/.test(dir));

    // Add year pages
    years.forEach(year => {
        pages.push({
            title: `${year} Words`,
            path: `words/${year}`
        });
    });

    return pages;
}

/**
 * Determines the social image URL based on the page type and data
 * @param {Object} options - Options for determining the social image URL
 * @param {string|URL} options.site - The site's base URL
 * @param {string} options.pathname - The current page path
 * @param {Object} [options.wordData] - Word data if this is a word page
 * @returns {string} The social image URL
 */
export function getSocialImageUrl({ site, pathname, wordData }) {
    // If we have word data, use the word image
    if (wordData?.word && wordData?.date) {
        const year = wordData.date.slice(0, 4);
        return new URL(
            `/images/social/${year}/${wordData.date}-${wordData.word}.png`,
            site.toString()
        ).toString();
    }

    // Check if this is a year page
    const yearMatch = pathname.match(/^\/words\/(\d{4})$/);
    if (yearMatch) {
        const year = yearMatch[1];
        return new URL(
            `/images/social/${year}/${year}0000-words.png`,
            site.toString()
        ).toString();
    }

    // For all other pages, use the page-specific image
    const pagePath = pathname.replace(/^\/|\/$/g, '') || 'home';
    return new URL(
        `/images/social/pages/${pagePath.replace(/\//g, '-')}.png`,
        site.toString()
    ).toString();
}
