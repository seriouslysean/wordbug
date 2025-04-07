import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Gets all static pages that need generic social images
 * @returns {Array<{title: string, path: string}>}
 */
export async function getStaticPages() {
    // Use Astro's import.meta.glob to get all pages
    const pages = await import.meta.glob('../pages/**/*.astro');
    const staticPages = new Map();

    for (const [filePath, page] of Object.entries(pages)) {
        // Skip dynamic routes and index pages
        if (filePath.includes('[') || filePath.includes(']') || filePath.endsWith('index.astro')) {
            continue;
        }

        // Get the page content to extract the title
        const content = fs.readFileSync(path.join(__dirname, '..', filePath), 'utf-8');
        const titleMatch = content.match(/title:\s*["'](.*?)["']/);
        const title = titleMatch ? titleMatch[1] :
            path.basename(filePath, '.astro').replace(/-/g, ' ');

        // Get the URL path
        const urlPath = filePath
            .replace('../pages/', '')
            .replace('.astro', '')
            .replace(/\\/g, '/'); // Convert Windows paths to forward slashes

        // Use the path as the key to prevent duplicates
        staticPages.set(urlPath, {
            title,
            path: urlPath
        });
    }

    return Array.from(staticPages.values());
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
        return new URL(
            `/images/social/${wordData.date.slice(0, 4)}/${wordData.date}-${wordData.word}.png`,
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
