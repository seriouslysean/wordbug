import type { WordData } from '~types';

/**
 * Get social media image URL for a word or page
 * @param params - Pathname and optional word data
 * @returns URL to the social image
 */
export function getSocialImageUrl({ pathname, wordData }: { pathname: string; wordData?: WordData | null }): string {
  const basePath = import.meta.env.BASE_PATH || '/';
  const cleanPath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  const sourceDir = import.meta.env.SOURCE_DIR;
  const sourcePath = sourceDir ? `${sourceDir}/` : '';

  if (wordData && wordData.word) {
    // Word-specific social image
    const year = wordData.date.slice(0, 4);
    return `${basePath}images/social/${sourcePath}${year}/${wordData.date}-${wordData.word}.png`;
  }


  // Generic page social image
  return `${basePath}images/social/pages/${cleanPath || 'index'}.png`;
}

/**
 * Get static pages for image generation
 * @returns Metadata for all static pages
 */
export async function getStaticPages() {
  const { getAllPageMetadata } = await import('~astro-utils/page-metadata');
  return getAllPageMetadata();
}