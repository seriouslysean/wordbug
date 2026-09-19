import { allWords } from '#astro-utils/word-data-utils';
import { stripBasePath } from '#astro-utils/url-utils';
import {
  getAllPageMetadata as getAllPageMetadataBase,
  createPageMetadataLookup,
} from '#utils/page-metadata-utils';

/**
 * Astro-specific page metadata functions with environment handling
 * 
 * This wrapper serves legitimate purposes:
 * - Handles Astro-specific BASE_PATH environment variable
 * - Provides automatic word data injection from Astro Content Collections
 * - Maintains clean page-level API following community standards
 * - Prepared for future i18n expansion
 * 
 * Research shows this pattern aligns with Astro community best practices:
 * - Layout-based metadata with colocated definitions
 * - Environment-specific handling in Astro tier
 * - Clean separation between shared utilities and framework-specific logic
 */

/**
 * Get metadata for a specific page path (Astro-specific)
 * Automatically handles BASE_PATH stripping and provides word data
 * 
 * @param pathname - Raw pathname from Astro.url.pathname (may include BASE_PATH)
 * @returns Page metadata with title, description, category, etc.
 */
const getCachedPageMetadata = createPageMetadataLookup(allWords);

export const getPageMetadata = (pathname: string) =>
  getCachedPageMetadata(stripBasePath(pathname) || 'home');

/**
 * Get metadata for all pages (Astro-specific)
 * Automatically provides word data for sitemap generation
 * 
 * @returns Array of all page metadata objects
 */
export const getAllPageMetadata = () => getAllPageMetadataBase(allWords);
