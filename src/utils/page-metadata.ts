import { allWords } from '~astro-utils/word-data-utils';
import {
  getAllPageMetadata as getAllPageMetadataBase,
  getPageMetadata as getPageMetadataBase,
} from '~utils/page-metadata-utils';

/**
 * Remove BASE_PATH prefix from an incoming pathname
 * Handles case differences and trailing slashes
 * @param pathname - Raw pathname that may include the base path
 * @returns Pathname relative to the site root
 */
function stripBasePath(pathname: string): string {
  const base = (import.meta.env.BASE_PATH || '').replace(/\/+$/, '');
  const hasBase = base && pathname.toLowerCase().startsWith(base.toLowerCase());
  const withoutBase = hasBase ? pathname.slice(base.length) : pathname;
  const clean = withoutBase.replace(/^\/+|\/+$/g, '');
  return clean || 'home';
}

/**
 * Client-side functions partially applied with allWords
 * Clean signatures with no unnecessary parameters
 */

/**
 * Get metadata for a specific page path
 */
export const getPageMetadata = (pathname: string) =>
  getPageMetadataBase(stripBasePath(pathname), allWords);

/**
 * Get metadata for all pages
 */
export const getAllPageMetadata = () => getAllPageMetadataBase(allWords);
