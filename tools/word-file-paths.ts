import fs from 'node:fs';
import path from 'node:path';

import { getErrorMessage } from '#utils/text-utils';

interface UnreadableDirectory {
  path: string;
  error: string;
}

export interface WordFileListing {
  /** Absolute path of every word file, sorted */
  files: string[];
  /** Directories under the words directory that could not be listed */
  unreadable: UnreadableDirectory[];
}

/**
 * Lists the files the site builds a word from, by the rule the content
 * collection's loader applies in src/content.config.ts: `**\/*.json` under
 * the words directory, as tinyglobby matches it. That is every file whose
 * name ends in `.json` (lower case) at any depth, with no file or directory
 * whose name starts with a dot (macOS writes ._20250701.json beside a file
 * copied to a non-Apple volume) and with symbolic links followed. Every tool
 * reads the corpus through this, so the tools agree with each other and with
 * the build on which files hold a word.
 *
 * One deliberate difference: the loader lists a directory that a link also
 * points to under both paths, and builds its words twice. Here it is listed
 * once, under the path that sorts first, so no tool processes a word twice.
 * A directory that cannot be listed is reported, not skipped, so a partial
 * corpus cannot pass for a complete one.
 * @param wordsDir - The words directory, which must exist
 */
export const listWordFilePaths = (wordsDir: string): WordFileListing => {
  const files: string[] = [];
  const unreadable: UnreadableDirectory[] = [];
  // A link back to a directory above it would otherwise never end
  const visited = new Set<string>();

  const walk = (directory: string): void => {
    try {
      const real = fs.realpathSync(directory);
      if (visited.has(real)) {
        return;
      }
      visited.add(real);

      // Sorted by code unit: the order a directory is read in differs by
      // file system, and decides which of two paths to one directory is kept
      const entries = fs.readdirSync(directory, { withFileTypes: true })
        .toSorted((a, b) => Number(a.name > b.name) - Number(a.name < b.name));
      for (const entry of entries) {
        if (entry.name.startsWith('.')) {
          continue;
        }
        const entryPath = path.join(directory, entry.name);
        // A link is what it points to; a broken one is nothing
        const stats = entry.isSymbolicLink() ? fs.statSync(entryPath, { throwIfNoEntry: false }) : entry;
        if (stats?.isDirectory()) {
          walk(entryPath);
        } else if (stats?.isFile() && entry.name.endsWith('.json')) {
          files.push(entryPath);
        }
      }
    } catch (error) {
      unreadable.push({ path: directory, error: getErrorMessage(error) });
    }
  };

  walk(wordsDir);
  return { files: files.toSorted(), unreadable };
};
