/**
 * Configuration file for occasional-wotd
 *
 * Centralizes shared paths used across the application.
 */

import path from 'path';

import type { PathConfig } from '~types/config';

// Get the project root - use process.cwd() to ensure we get the actual project root
// regardless of where this file is executed from (source or built)
const ROOT = process.cwd();

// Shared path construction logic - uses SOURCE_DIR as single source of truth
const getWordsPath = (): string => {
  const sourceDir = process.env.SOURCE_DIR || '';
  return sourceDir ? path.join(ROOT, 'data', sourceDir, 'words') : path.join(ROOT, 'data', 'words');
};

const getImagesPath = (): string => {
  const sourceDir = process.env.SOURCE_DIR || '';
  return sourceDir ? path.join(ROOT, 'public', sourceDir, 'images') : path.join(ROOT, 'public', 'images');
};

export const createPaths = (): PathConfig => ({
  words: getWordsPath(),
  pages: path.join(ROOT, 'src', 'pages'),
  images: getImagesPath(),
  fonts: path.join(ROOT, 'public', 'fonts'),
});

// Default paths for tools
export const paths = createPaths();

export default { paths };
