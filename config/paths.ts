/**
 * Configuration file for occasional-wotd
 *
 * Centralizes shared paths used across the application.
 */

import path from 'path';

import type { PathConfig } from '#types';

const ROOT = process.cwd();

const getWordsPath = (): string => {
  const sourceDir = process.env.SOURCE_DIR;
  return sourceDir
    ? path.join(ROOT, 'data', sourceDir, 'words')
    : path.join(ROOT, 'data', 'words');
};

const getImagesPath = (): string => {
  // Redirect generated-image output when set (tests point this at a temp dir
  // so image generation never overwrites tracked social cards under public/).
  const outputOverride = process.env.IMAGES_OUTPUT_DIR;
  if (outputOverride) {
    return outputOverride;
  }

  const sourceDir = process.env.SOURCE_DIR;
  return sourceDir
    ? path.join(ROOT, 'public', sourceDir, 'images')
    : path.join(ROOT, 'public', 'images');
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
