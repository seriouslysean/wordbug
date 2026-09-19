import { SOURCE_DIR } from 'astro:env/client';
import { getFullUrl, stripBasePath } from '#astro-utils/url-utils';
import type { WordData } from '#types';
import { getSocialImagePath, toUrlPath } from '#utils/image-path-utils';
import type { SocialCard } from '#utils/image-path-utils';

/**
 * Get social media image URL for a word or page
 * @param params - Pathname and optional word data
 * @returns Absolute URL to the social image, as Open Graph requires
 */
export function getSocialImageUrl({ pathname, wordData }: { pathname: string; wordData?: WordData | null }): string {
  const card: SocialCard = wordData?.word
    ? { type: 'word', word: wordData.word, date: wordData.date }
    : { type: 'page', path: stripBasePath(pathname) };

  return getFullUrl(toUrlPath(getSocialImagePath(card, SOURCE_DIR)));
}

/**
 * Get static pages for image generation
 * @returns Metadata for all static pages
 */
export async function getStaticPages() {
  const { getAllPageMetadata } = await import('#astro-utils/page-metadata');
  return getAllPageMetadata();
}
