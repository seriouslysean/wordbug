import { generateGenericShareImage } from '~tools/utils';
import { getStaticPages } from '~utils/page-utils';

/**
 * Generates a social share image for a specific page
 * @param pagePath - The path of the page to generate an image for
 */
async function generatePageImage(pagePath: string): Promise<void> {
  if (!pagePath) {
    throw new Error('Page path is required');
  }

  const staticPages = getStaticPages();
  const page = staticPages.find(p => p.path === pagePath);

  if (!page) {
    throw new Error(`Page "${pagePath}" not found in static pages`);
  }

  await generateGenericShareImage(page.title, page.path);
  console.info(`Generated social image for "${page.title}" (${page.path})`);
}

// Run if called directly
if (import.meta.url.endsWith(process.argv[1])) {
  const [,, pagePath] = process.argv;

  if (!pagePath) {
    console.error('Usage: node tools/generate-page-image.js <page-path>');
    process.exit(1);
  }

  generatePageImage(pagePath).catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}

export { generatePageImage };
