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

// Shared path construction logic
export const createPaths = (sourceDir: string = process.env.SOURCE_DIR || ''): PathConfig => ({
  words: path.join(ROOT, 'data', sourceDir, 'words'),
  pages: path.join(ROOT, 'src', 'pages'),
  images: path.join(ROOT, 'public', sourceDir, 'images'),
  fonts: path.join(ROOT, 'public', 'fonts'),
});

// Default paths for tools (using process.env)
export const paths = createPaths();

export default { paths };
