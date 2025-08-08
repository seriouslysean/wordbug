import { allWords } from '~utils-client/word-data-utils';
import { getAllPageMetadata as getAllPageMetadataBase, getPageMetadata as getPageMetadataBase } from '~utils/page-metadata-utils';

/**
 * Client-side functions partially applied with allWords
 * Clean signatures with no unnecessary parameters
 */

/**
 * Get metadata for a specific page path
 */
export const getPageMetadata = (pathname: string) => getPageMetadataBase(pathname, allWords);

/**
 * Get metadata for all pages
 */
export const getAllPageMetadata = () => getAllPageMetadataBase(allWords);