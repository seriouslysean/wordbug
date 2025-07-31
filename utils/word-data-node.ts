import fs from 'fs';
import path from 'path';

import { createPaths } from '~config/paths';
import type { WordFileInfo } from '~utils/word-data-processor';
import { logger } from '~utils-client/logger';

/**
 * Node.js file loader implementation for dependency injection
 * Reads word files from the filesystem using Node.js APIs
 */
export const getWordFilesNode = (): WordFileInfo[] => {
  const paths = createPaths();


  if (!fs.existsSync(paths.words)) {
    logger.error('Word directory does not exist', { path: paths.words });
    return [];
  }

  // Get all JSON files recursively
  const getAllJsonFiles = (dir: string): string[] => {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    return items.flatMap(item => {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        return getAllJsonFiles(fullPath);
      } else if (item.name.endsWith('.json')) {
        return [fullPath];
      }
      return [];
    });
  };

  return getAllJsonFiles(paths.words)
    .sort((a, b) => {
      // Sort by filename (not full path) descending (newest first)
      const filenameA = path.basename(a);
      const filenameB = path.basename(b);
      return filenameB.localeCompare(filenameA);
    })
    .map(filePath => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath, '.json');

        return {
          filePath,
          date: fileName,
          content,
        };
      } catch (error) {
        logger.error('Error reading word file', { file: filePath, error: (error as Error).message });
        return null;
      }
    }).filter(Boolean) as WordFileInfo[];
};