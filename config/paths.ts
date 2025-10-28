/**
 * Configuration file for occasional-wotd
 *
 * Centralizes shared paths used across the application.
 */

import path from 'path';

import type { PathConfig } from '~types';

const ROOT = process.cwd();
const getWordsPath = (): string => {
  const sourceDir = process.env.SOURCE_DIR || '';
  return sourceDir ? path.join(ROOT, 'data', sourceDir, 'words') : path.join(ROOT, 'data', 'words');
};

const getImagesPath = (): string => {
  const sourceDir = process.env.SOURCE_DIR || '';
  return sourceDir ? path.join(ROOT, 'public', sourceDir, 'images') : path.join(ROOT, 'public', 'images');
};

/**
 * Create resolved paths used across the application
 * @returns {PathConfig} Object containing absolute paths for words, pages, images and fonts
 */
export const createPaths = (): PathConfig => ({
  words: getWordsPath(),
  pages: path.join(ROOT, 'src', 'pages'),
  images: getImagesPath(),
  fonts: path.join(ROOT, 'tools', 'fonts'),
});

export const paths = createPaths();
