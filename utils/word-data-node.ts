import fs from 'fs';
import path from 'path';

import { createPaths } from '~config/paths';
import { logger } from '~utils-client/logger';
import type { WordFileInfo } from '~utils-client/word-data-shared';

/**
 * Node.js file loader implementation for dependency injection
 * Reads word files from the filesystem using Node.js APIs
 */
export const getWordFilesNode = (): WordFileInfo[] => {
  const paths = createPaths(process.env.SOURCE_DIR || '');

  if (!fs.existsSync(paths.words)) {
    logger.error('Word directory does not exist', { path: paths.words });
    return [];
  }

  const years = fs.readdirSync(paths.words).filter(dir => /^\d{4}$/.test(dir));

  if (years.length === 0) {
    logger.error('No year directories found', { path: paths.words });
    return [];
  }

  const files = years.flatMap(year => {
    try {
      const yearDir = path.join(paths.words, year);
      const jsonFiles = fs.readdirSync(yearDir)
        .filter(file => file.endsWith('.json'));

      return jsonFiles.map(file => {
        try {
          const filePath = path.join(yearDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const date = file.replace('.json', '');

          return {
            filePath,
            date,
            content,
          };
        } catch (error) {
          logger.error('Error reading word file', { file, error: (error as Error).message });
          return null;
        }
      }).filter(Boolean) as WordFileInfo[];
    } catch (error) {
      logger.error('Error reading year directory', { year, error: (error as Error).message });
      return [];
    }
  });

  // Sort by date (newest first) for consistency
  return files.sort((a, b) => b.date.localeCompare(a.date));
};