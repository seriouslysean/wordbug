import { generateGenericShareImage } from './utils.js';
import { getStaticPages } from '../src/utils/page-utils.js';
import logger from '../src/utils/logger.js';

/**
 * Generate a social image for a specific page
 * @param {string} pagePath - The path of the page to generate an image for
 */
async function generatePageImage(pagePath) {
  if (!pagePath) {
    throw new Error('Page path is required');
  }

  const staticPages = getStaticPages();
  const page = staticPages.find(p => p.path === pagePath);

  if (!page) {
    throw new Error(`Page "${pagePath}" not found in static pages`);
  }

  await generateGenericShareImage(page.title, page.path);
  logger.info(`Generated social image for "${page.title}" (${page.path})`);
}

// Run if called directly
if (import.meta.url.endsWith(process.argv[1])) {
  const [,, pagePath] = process.argv;

  if (!pagePath) {
    logger.error('Usage: node tools/generate-page-image.js <page-path>');
    process.exit(1);
  }

  generatePageImage(pagePath).catch(error => {
    logger.error(error.message);
    process.exit(1);
  });
}

export { generatePageImage };
