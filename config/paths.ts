/**
 * Configuration file for occasional-wotd
 *
 * Centralizes shared paths used across the application.
 */

import path from 'path';
import { fileURLToPath } from 'url';

import type { PathConfig } from '~types/config';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Get the project root (one level up from config directory)
const ROOT = path.resolve(__dirname, '..');

// Define only the file system paths that are actually used
export const paths: PathConfig = {
  words: path.join(ROOT, 'data', 'words'),
  demoWords: path.join(ROOT, 'data', 'demo', 'words'),
  buildData: path.join(ROOT, 'data', 'build-data.json'),
  pages: path.join(ROOT, 'src', 'pages'),
  images: path.join(ROOT, 'public', 'images'),
  fonts: path.join(ROOT, 'public', 'fonts'),
};

export default { paths };
